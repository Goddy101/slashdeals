// lib/notifications.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderDetails {
  orderId: string;
  itemTitle: string;
  amount: number;
  sellerEmail: string;
  sellerPhone: string;
}

export interface BroadcastParams {
  title: string;
  price: number;
  imageUrl: string;
  dealUrl: string;
  isFlashBump?: boolean;
}

// ============================================================================
// 1. PRIVATE ALERTS (To SlashDeals Admins & Merchants)
// ============================================================================

// FREE: Admin Telegram Alert (For manual WhatsApp follow-up)
export async function sendAdminTelegramAlert(details: OrderDetails) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID; // Your private admin group ID

  if (!token || !chatId) return;

  const message = `
🚨 <b>NEW ESCROW FUNDED!</b> 🚨
<b>Item:</b> ${details.itemTitle}
<b>Amount:</b> ₦${details.amount.toLocaleString()}
<b>Order ID:</b> ${details.orderId}

👤 <b>Seller Details (ACTION REQUIRED):</b>
<b>Email:</b> ${details.sellerEmail}
<b>Phone:</b> ${details.sellerPhone}

👉 <i>Click to WhatsApp:</i> https://wa.me/${details.sellerPhone.replace('+', '')}
  `;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Telegram notification failed:', error);
  }
}

// FREE: Automated Email to Seller (via Resend)
export async function sendSellerEmail(details: OrderDetails) {
  try {
    await resend.emails.send({
      from: 'SlashDeals Escrow <escrow@slashdeals.com.ng>',
      to: details.sellerEmail,
      subject: `Action Required: ₦${details.amount.toLocaleString()} Secured for ${details.itemTitle}`,
      html: `
        <h2>Great news! Your Escrow Vault has been funded.</h2>
        <p>A buyer has successfully deposited <strong>₦${details.amount.toLocaleString()}</strong> into the SlashDeals Escrow Vault for your item: <b>${details.itemTitle}</b>.</p>
        <p>Please log in to your dashboard to view the delivery instructions. The buyer will provide you with a Delivery PIN once they have received and inspected the item.</p>
        <br/>
        <a href="https://slashdeals.com.ng/dashboard" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">View Escrow Dashboard</a>
      `,
    });
  } catch (error) {
    console.error('Email notification failed:', error);
  }
}

// FUTURE PHASE: Automated SendChamp SMS/WhatsApp (Currently disabled to save costs)
export async function sendSellerWhatsApp_FUTURE(details: OrderDetails) {
  console.log(`[STUB] Would have sent SendChamp WhatsApp to ${details.sellerPhone}`);
}

// The Master Trigger Function for Escrow Payments
export async function triggerEscrowFundedNotifications(details: OrderDetails) {
  // Fire them off in parallel so they don't block the webhook response time
  await Promise.all([
    sendAdminTelegramAlert(details),
    sendSellerEmail(details),
    // sendSellerWhatsApp_FUTURE(details) <-- Uncomment when you have revenue!
  ]);
}

// ============================================================================
// 2. PUBLIC BROADCASTS (To your Public Telegram Channel)
// ============================================================================

export async function broadcastDealToTelegram({
  title,
  price,
  imageUrl,
  dealUrl,
  isFlashBump = false,
}: BroadcastParams) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID; // Your public channel e.g., @slashdeals_ng

  if (!botToken || !channelId) {
    console.warn('⚠️ Telegram public channel credentials missing. Broadcast skipped.');
    return;
  }

  const tag = isFlashBump ? '⚡ <b>FLASH BUMP</b> ⚡' : '🔥 <b>NEW DEAL DROP</b> 🔥';
  
  const caption = `${tag}\n\n<b>${title}</b>\n💰 <b>Price:</b> ₦${price.toLocaleString()}\n\n🔒 <i>Secured by SlashDeals Escrow.</i>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        photo: imageUrl,
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🛒 View Deal & Buy Securely',
                url: dealUrl,
              },
            ],
          ],
        },
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('Telegram Broadcast Failed:', data.description);
    }
  } catch (error) {
    console.error('Telegram Network Error:', error);
  }
}