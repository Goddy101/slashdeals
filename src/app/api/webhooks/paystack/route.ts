// src/app/api/webhooks/paystack/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role client for secure background database updates bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const bodyText = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  // 1. Verify webhook signature for security
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(bodyText)
    .digest('hex');

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(bodyText);

  // 2. Handle successful transactions
  if (event.event === 'charge.success') {
    const paymentData = event.data;
    const email = paymentData.customer.email;
    const amountPaid = paymentData.amount / 100; // Convert back from kobo to Naira
    const metadata = paymentData.metadata || {};

    // Extract payment type safely (checking custom_fields first, falling back to direct type)
    const paymentType = metadata.custom_fields?.find((f: any) => f.variable_name === 'payment_type')?.value || metadata.type;

    // --- SCENARIO A: WALLET TOP-UP ---
    if (paymentType === 'wallet_funding') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, wallet_balance')
        .eq('email', email)
        .single();

      if (profile) {
        const newBalance = (profile.wallet_balance || 0) + amountPaid;
        
        await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', profile.id);
          
        // Log the deposit in wallet transactions
        await supabaseAdmin.from('wallet_transactions').insert([{
          merchant_id: profile.id,
          amount: amountPaid,
          type: 'deposit',
          reference: paymentData.reference,
          status: 'success'
        }]);
      }
    }

    // --- SCENARIO B: CATEGORY MONOPOLY AD PURCHASE ---
    if (paymentType === 'ad_campaign_monopoly' && metadata.campaign_details) {
      const { merchant_id, category, headline, image_url, target_url } = metadata.campaign_details;

      // 1. Calculate timeframes (Monopolies run for 30 days)
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Create a clean Date format for 'target_month' (e.g. 2026-10-01)
      const targetMonth = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}-01`;

      // 2. Lock in the Monopoly rights in the DB
      await supabaseAdmin.from('category_monopolies').insert([{
        merchant_id,
        category,
        target_month: targetMonth,
        price_paid: amountPaid,
        status: 'active'
      }]);

      // 3. Create the active Ad Campaign to display on the frontend
      await supabaseAdmin.from('ad_campaigns').insert([{
        merchant_id,
        category,
        linked_deal_id: target_url, // Assuming you passed the deal UUID here
        image_url,
        headline,
        status: 'active',
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString()
      }]);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}



// // app/api/webhooks/paystack/route.ts
// import { NextResponse } from 'next/server';
// import crypto from 'crypto';
// import { createClient } from '@supabase/supabase-js';
// import { triggerEscrowFundedNotifications } from '@/lib/notifications';

// // Use service role to bypass RLS for webhook backend operations
// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(req: Request) {
//   try {
//     const rawBody = await req.text();
//     const signature = req.headers.get('x-paystack-signature');

//     // 🛡️ FIX 2: Ensure the signature header actually exists to prevent crashes
//     if (!signature) {
//       return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
//     }

//     // 1. Verify Paystack Signature
//     const hash = crypto
//       .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
//       .update(rawBody)
//       .digest('hex');

//     if (hash !== signature) {
//       return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 400 });
//     }

//     const event = JSON.parse(rawBody);

//     // Only process successful charges
//     if (event.event === 'charge.success') {
//       const reference = event.data.reference;
//       const metadata = event.data.metadata || {};

//       // Helper to find the payment type
//       const paymentType = metadata.transaction_type || 
//         metadata?.custom_fields?.find((f: any) => f.variable_name === 'payment_type')?.value;

//       // ============================================
//       // ROUTE 1: WALLET TOP-UP
//       // ============================================
//       if (paymentType === 'wallet_topup') {
//         const merchantId = metadata.merchant_id;
//         const amountPaidNGN = event.data.amount / 100;

//         const { error } = await supabaseAdmin.rpc('fund_merchant_wallet', {
//           p_user_id: merchantId,
//           p_amount: amountPaidNGN,
//           p_reference: reference
//         });

//         if (error) console.error(`❌ Failed to fund wallet for ref ${reference}:`, error);
//         else console.log(`✅ Wallet funded: ₦${amountPaidNGN} for merchant ${merchantId}`);
//       } 
      
//       // ============================================
//       // ROUTE 2: FLASH BUMP PAYMENT
//       // ============================================
//       else if (paymentType === 'flash_bump') {
//         const dealId = metadata.deal_id;
//         console.log(`✅ Flash Bump paid for deal: ${dealId}`);
//       }

//       // ============================================
//       // ROUTE 3: CATEGORY MONOPOLY (B2B ADS) 🚀
//       // ============================================
//       else if (paymentType === 'ad_campaign_monopoly') {
//         const campaign = metadata.campaign_details;
        
//         if (campaign) {
//           const expiresAt = new Date();
//           expiresAt.setDate(expiresAt.getDate() + 30);

//           // 🛡️ FIX 1: Bulletproof UUID Extractor (ignores query params & trailing slashes)
//           const targetUrl = campaign.target_url || '';
//           const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
//           const extractedMatch = targetUrl.match(uuidRegex);
//           const safeDealId = extractedMatch ? extractedMatch[0] : null;

//           const { error } = await supabaseAdmin
//             .from('ad_campaigns')
//             .insert({
//               merchant_id: campaign.merchant_id,
//               category: campaign.category,
//               headline: campaign.headline,
//               image_url: campaign.image_url,
//               linked_deal_id: safeDealId, // Safely extracted UUID
//               status: 'active',
//               starts_at: new Date().toISOString(),
//               expires_at: expiresAt.toISOString(),
//             });

//           if (error) console.error(`❌ DB Error (Ad Campaign) for ref ${reference}:`, error);
//           else console.log(`✅ SUCCESS: Category Monopoly activated for ${campaign.category}`);
//         }
//       }



//       // Add this inside your webhook POST handler, where you check the `event.event` string

// if (event.event === 'transfer.success') {
//   const reference = event.data.reference; // e.g., "SD_WD_{tx.id}_{timestamp}"
//   const txId = reference.split('_')[2]; // Extract the transaction ID

//   // 1. Mark transaction as successfully completed
//   await supabaseAdmin
//     .from('wallet_transactions')
//     .update({ status: 'completed', updated_at: new Date().toISOString() })
//     .eq('id', txId);
// }

// if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
//   const reference = event.data.reference;
//   const txId = reference.split('_')[2];
//   const amountToRefund = event.data.amount / 100; // Convert Kobo back to NGN

//   // 1. Fetch the transaction to get the merchant_id
//   const { data: tx } = await supabaseAdmin
//     .from('wallet_transactions')
//     .select('merchant_id, status')
//     .eq('id', txId)
//     .single();

//   if (tx && tx.status !== 'failed') {
//     // 2. Mark the transaction as failed
//     await supabaseAdmin
//       .from('wallet_transactions')
//       .update({ status: 'failed', updated_at: new Date().toISOString() })
//       .eq('id', txId);

//     // 3. SECURELY REFUND THE WALLET (Using RPC to prevent race conditions)
//     await supabaseAdmin.rpc('increment_wallet_balance', {
//       merch_id: tx.merchant_id,
//       amount_to_add: amountToRefund
//     });
//   }
// }

//       // ============================================
//       // ROUTE 4: ESCROW FUNDING (Default/Marketplace)
//       // ============================================
//       else {
//         const fundedAt = new Date();
//         const inspectionExpiresAt = new Date(fundedAt.getTime() + 48 * 60 * 60 * 1000);

//         const { data: escrow, error } = await supabaseAdmin
//           .from('escrows')
//           .update({
//             status: 'funded',
//             funded_at: fundedAt.toISOString(),
//             inspection_expires_at: inspectionExpiresAt.toISOString(),
//           })
//           .eq('payment_reference', reference)
//           .eq('status', 'pending_payment')
//           .select(`id, amount, listing_id, listings ( title )`)
//           .single();

//         if (error || !escrow) {
//           console.error(`❌ Escrow matching reference ${reference} not found`);
//         } else {
//           await supabaseAdmin
//             .from('listings')
//             .update({ status: 'escrow_locked' })
//             .eq('id', escrow.listing_id);

//           const { data: sellerData } = await supabaseAdmin
//             .from('profiles')
//             .select('email, phone')
//             .eq('id', metadata.sellerId || metadata.merchant_id)
//             .single();

//           const itemTitle = Array.isArray(escrow.listings) 
//             ? escrow.listings[0]?.title 
//             : (escrow.listings as any)?.title || 'SlashDeals Asset';

//           await triggerEscrowFundedNotifications({
//             orderId: escrow.id,
//             itemTitle: itemTitle,
//             amount: escrow.amount,
//             sellerEmail: sellerData?.email || event.data.customer.email, 
//             sellerPhone: sellerData?.phone || '+2340000000000'
//           });

//           console.log(`✅ Escrow successfully locked: ${reference}`);
//         }
//       }
//     }

//     return NextResponse.json({ received: true });
    
//   } catch (error: any) {
//     console.error('Webhook Error:', error.message);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }

// }