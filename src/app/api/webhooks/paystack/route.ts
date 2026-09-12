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
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // 1. Verify webhook signature for security
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(bodyText)
      .digest('hex');

    if (hash !== signature) {
      console.error('🚨 Invalid Paystack Signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(bodyText);

    // 2. Handle successful transactions
    if (event.event === 'charge.success') {
      const paymentData = event.data;
      const email = paymentData.customer.email;
      const amountPaid = paymentData.amount / 100; // Convert back from kobo to Naira
      const metadata = paymentData.metadata || {};

      // Extract payment type safely (Check our new transaction_type first, fallback to old structure)
      const paymentType = metadata.transaction_type || 
                          metadata.custom_fields?.find((f: any) => f.variable_name === 'payment_type')?.value || 
                          metadata.type;

      // ====================================================================
      // SCENARIO A: WALLET TOP-UP
      // ====================================================================
      if (paymentType === 'wallet_funding') {
        console.log(`💰 Processing Wallet Funding for: ${email}`);
        
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
            
          await supabaseAdmin.from('wallet_transactions').insert([{
            merchant_id: profile.id,
            amount: amountPaid,
            type: 'deposit',
            reference: paymentData.reference,
            status: 'completed',
            metadata: { note: 'Card/Bank Deposit' }
          }]);
        }
      }

      // ====================================================================
      // SCENARIO B: CATEGORY MONOPOLY AD PURCHASE (From our new Checkout)
      // ====================================================================
      else if (paymentType === 'ad_purchase') {
        console.log(`🚀 Activating Ad Campaign for Merchant: ${metadata.merchant_id}`);
        
        const { merchant_id, category_id, headline, image_url, deal_link } = metadata;

        const startsAt = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Runs for 30 days
        const targetMonth = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}-01`;

        // 1. Lock in the Monopoly rights
        await supabaseAdmin.from('category_monopolies').insert([{
          merchant_id,
          category: category_id,
          target_month: targetMonth,
          price_paid: amountPaid,
          status: 'active'
        }]);

        // 2. Create the active Ad Campaign
        await supabaseAdmin.from('ad_campaigns').insert([{
          merchant_id,
          category: category_id,
          linked_deal_id: deal_link, 
          image_url,
          headline,
          status: 'active',
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString()
        }]);

        // 3. Log the purchase in the merchant's ledger (for tax/accounting)
        await supabaseAdmin.from('wallet_transactions').insert([{
          merchant_id,
          amount: amountPaid,
          type: 'ad_purchase',
          status: 'completed',
          reference: paymentData.reference,
          metadata: { note: 'Monopoly Ad Paid via Paystack', category: category_id }
        }]);
      }

      // ====================================================================
      // SCENARIO C: ESCROW VAULT PAYMENT (Marketplace Checkout)
      // ====================================================================
      else if (paymentType === 'escrow_payment') {
        console.log(`🔒 Locking Escrow Vault: ${metadata.escrow_id}`);
        
        // Update the Escrow status from 'pending_payment' to 'awaiting_seller'
        await supabaseAdmin
          .from('escrows')
          .update({
            status: 'awaiting_seller',
            total_paid: amountPaid,
            payment_reference: paymentData.reference,
            funded_at: new Date().toISOString()
          })
          .eq('id', metadata.escrow_id);
          
        // Optional: Update the deal status to "sold/reserved" so no one else buys it
        if (metadata.listing_id) {
          await supabaseAdmin
            .from('deals')
            .update({ status: 'reserved' })
            .eq('id', metadata.listing_id);
        }
      }

      // ====================================================================
      // SCENARIO D: WITHDRAWAL COMPLETED SUCCESSFULLY
      // ====================================================================
      else if (event.event === 'transfer.success') {
        const transferData = event.data;
        const transactionId = transferData.reference; // This matches your DB row ID

        console.log(`✅ Withdrawal Success for Ref: ${transactionId}`);

        await supabaseAdmin
          .from('wallet_transactions')
          .update({ status: 'success' })
          .eq('id', transactionId);
      }

      // ====================================================================
      // SCENARIO E: WITHDRAWAL FAILED / REVERSED (BANK ERROR)
      // ====================================================================
      else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
        const transferData = event.data;
        const transactionId = transferData.reference;

        console.log(`❌ Withdrawal Failed for Ref: ${transactionId}. Refunding merchant...`);

        // 1. Fetch the failed transaction details
        const { data: tx } = await supabaseAdmin
          .from('wallet_transactions')
          .select('merchant_id, amount, status')
          .eq('id', transactionId)
          .single();

        // 2. If it's still marked as pending, execute the refund
        if (tx && tx.status === 'pending') {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('wallet_balance')
            .eq('id', tx.merchant_id)
            .single();

          if (profile) {
            // Restore funds to the merchant's wallet
            await supabaseAdmin
              .from('profiles')
              .update({ wallet_balance: Number(profile.wallet_balance) + Number(tx.amount) })
              .eq('id', tx.merchant_id);

            // Mark transaction as failed with the reason
            await supabaseAdmin
              .from('wallet_transactions')
              .update({ status: 'failed', metadata: { error: transferData.reason } })
              .eq('id', transactionId);
          }
        }
      }
    }

    // Always return a fast 200 OK so Paystack doesn't keep retrying the webhook
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Still return 200 to Paystack even on internal error to prevent retry flooding, 
    // but log it heavily on your server.
    return NextResponse.json({ error: 'Processed with errors' }, { status: 200 });
  }
}