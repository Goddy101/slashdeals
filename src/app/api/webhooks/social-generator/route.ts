// app/api/webhooks/social-generator/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to sanitize user input for Telegram HTML formatting
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  // 1. Security Check: Validate Secret Header
  const webhookSecret = request.headers.get('x-webhook-secret');
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized webhook trigger' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { event_type, listing_data, escrow_data } = body;

    let telegramCaption = '';
    let mediaUrl = '';
    
    // --- NEW: WhatsApp Notification Variables ---
    let waMessage = '';
    let merchantPhone = '';

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL; // e.g., Twilio, Termii, or Fincra URL
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

    // =======================================================================
    // Trigger 1: High-Value Listing Dropped
    // =======================================================================
    if (event_type === 'NEW_HIGH_TICKET_LISTING' && listing_data) {
      const rawPrice = Number(listing_data.price || 0);
      const priceFormatted = rawPrice >= 1000000 
        ? `₦${(rawPrice / 1000000).toFixed(1)}M` 
        : `₦${rawPrice.toLocaleString()}`;
      
      const locationName = escapeHtml(listing_data.location_name || 'Nigeria');
      const categoryName = escapeHtml(listing_data.category_name || 'Verified Asset');
      const title = escapeHtml(listing_data.title || 'High-Ticket Listing');
      const dealUrl = `${process.env.NEXT_SITE_URL}/vault/${listing_data.id}`;

      mediaUrl = `${process.env.NEXT_SITE_URL}/api/og/flyer?deal_id=${listing_data.id}&format=square&template=luxury`;

      telegramCaption = `🚨 <b>NEW HIGH-TICKET DROP IN ${locationName.toUpperCase()}</b> 🚨\n\n` +
                        `<b>Asset:</b> ${title}\n` +
                        `<b>Category:</b> ${categoryName}\n` +
                        `<b>Valuation:</b> ${priceFormatted}\n\n` +
                        `🛡️ <b>100% Escrow Protected.</b> Secure handover active.\n\n` +
                        `Secure the acquisition here:\n` +
                        `👉 <a href="${dealUrl}">${dealUrl}</a>`;

      // --- NEW: Prepare Merchant Private Ping ---
      merchantPhone = listing_data.merchant_phone; 
      waMessage = `Hey! Your drop "${title}" is now LIVE on the SlashDeals Telegram channel. 🚀\n\nLog in to your dashboard to generate your custom WhatsApp Status flyer and drive more traffic.`;
    }

    // =======================================================================
    // Trigger 2: Escrow Completed (Social Proof)
    // =======================================================================
    if (event_type === 'ESCROW_COMPLETED' && escrow_data) {
      const escrowAmount = Number(escrow_data.amount || 0).toLocaleString();
      const assetCategory = escapeHtml(escrow_data.category_name || 'Verified Asset');
      const assetTitle = escapeHtml(escrow_data.title || 'Marketplace Item');
      
      mediaUrl = `${process.env.NEXT_SITE_URL}/api/og/flyer?deal_id=${escrow_data.listing_id}&format=square&template=minimal`;

      telegramCaption = `🔒 <b>TRANSACTION CLEARED</b> 🔒\n\n` +
                        `<b>Asset Cleared:</b> ${assetTitle}\n` +
                        `<b>Volume Settled:</b> ₦${escrowAmount}\n` +
                        `<b>Category:</b> ${assetCategory}\n\n` +
                        `Another transaction completed safely via our 48-Hour Escrow Vault. Zero risk.\n\n` +
                        `Trade securely across Nigeria:\n` +
                        `👉 <a href="https://slashdeals.com.ng">https://slashdeals.com.ng</a>`;

      // --- NEW: Prepare Merchant Private Ping ---
      merchantPhone = escrow_data.merchant_phone;
      waMessage = `Congrats! 🎉 Your transaction for "${assetTitle}" just cleared our Escrow Vault. ₦${escrowAmount} has been credited to your Wallet.`;
    }

    let tgStatus = 'skipped';

    // =======================================================================
    // 1. TELEGRAM DISPATCH (Public FOMO)
    // =======================================================================
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID && telegramCaption) {
      try {
        const tgEndpoint = mediaUrl 
          ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto` 
          : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const payload = mediaUrl ? {
            chat_id: TELEGRAM_CHANNEL_ID,
            photo: mediaUrl,
            caption: telegramCaption,
            parse_mode: 'HTML'
        } : {
            chat_id: TELEGRAM_CHANNEL_ID,
            text: telegramCaption,
            parse_mode: 'HTML'
        };

        const tgRes = await fetch(tgEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const tgData = await tgRes.json();
        
        if (tgData.ok) {
          tgStatus = 'success';

          // =======================================================================
          // 2. WHATSAPP DISPATCH (Private Notification) - ONLY IF TELEGRAM SUCCEEDS
          // =======================================================================
          if (merchantPhone && waMessage && WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
            try {
              await fetch(WHATSAPP_API_URL, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                // Note: Adjust body format based on your specific SMS/WA provider (Twilio, Termii, etc.)
                body: JSON.stringify({
                  to: merchantPhone,
                  message: waMessage
                })
              });
            } catch (waErr) {
              console.error('WhatsApp Dispatch Error:', waErr);
              // We don't fail the whole webhook if WA fails, we just log it.
            }
          }
        } else {
          tgStatus = `failed: ${tgData.description}`;
        }
      } catch (err: any) {
        tgStatus = `error: ${err.message}`;
      }
    }

    // =======================================================================
    // 3. LOG TO QUEUE
    // =======================================================================
    if (telegramCaption) {
      await supabaseAdmin.from('social_queue').insert([
        { 
          platform: 'telegram', 
          post_body: telegramCaption, 
          media_url: mediaUrl, 
          status: tgStatus 
        }
      ]);
    }

    return NextResponse.json({ success: true, log: tgStatus });
  } catch (error: any) {
    console.error('Social Generator Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}


