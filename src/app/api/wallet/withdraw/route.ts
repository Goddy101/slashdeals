// src/app/api/wallet/withdraw/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 🔒 SECURITY FIX 1: Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, bank_name, account_number, bank_code } = await request.json();

    if (amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 });
    }

    if (!bank_name || !account_number || !bank_code) {
      return NextResponse.json({ error: 'Bank details are required' }, { status: 400 });
    }

    // ====================================================================
    // STEP 1: VERIFY BANK & CREATE TRANSFER RECIPIENT ON PAYSTACK
    // ====================================================================
    // We do this BEFORE touching the database so we fail early if the bank details are wrong.
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: 'SlashDeals Merchant', // Paystack will automatically verify the real name
        account_number: account_number,
        bank_code: bank_code,
        currency: 'NGN',
      }),
    });

    const recipientData = await recipientRes.json();
    if (!recipientData.status) {
      return NextResponse.json({ error: `Bank Error: ${recipientData.message}` }, { status: 400 });
    }

    // Initialize the Admin client
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ====================================================================
    // STEP 2: LOCK THE DATABASE VIA YOUR RPC
    // ====================================================================
    const { data, error } = await supabaseAdmin.rpc('request_withdrawal', {
      merch_id: user.id,
      withdraw_amount: amount,
      b_name: bank_name,
      b_code: bank_code, 
      acct_num: account_number
    });

    if (error) {
      console.error('RPC Error:', error.message);
      if (error.message.includes('Insufficient')) {
        return NextResponse.json({ error: 'Insufficient wallet funds.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Transaction failed at the database level' }, { status: 500 });
    }

    // ====================================================================
    // STEP 3: DISPATCH THE FIAT TRANSFER VIA PAYSTACK
    // ====================================================================
    const transactionId = data.transaction_id; // UUID from your database

    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Paystack uses kobo
        recipient: recipientData.data.recipient_code,
        reason: 'SlashDeals Wallet Withdrawal',
        reference: transactionId, // 🚀 We use the database ID as the Paystack reference!
      }),
    });

    const transferData = await transferRes.json();

    // 🚨 ROLLBACK IF PAYSTACK FAILS INSTANTLY (e.g., your platform's Paystack balance is low)
    if (!transferData.status) {
      // 1. Get the current balance
      const { data: profile } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', user.id).single();
      
      // 2. Refund the amount back to the merchant's wallet
      if (profile) {
        await supabaseAdmin.from('profiles').update({ wallet_balance: Number(profile.wallet_balance) + amount }).eq('id', user.id);
        await supabaseAdmin.from('wallet_transactions').update({ status: 'failed', metadata: { error: transferData.message } }).eq('id', transactionId);
      }
      return NextResponse.json({ error: 'Transfer failed. Funds returned to wallet.' }, { status: 500 });
    }

    // Success! The transfer is now "pending" and moving to the bank.
    return NextResponse.json({ 
      success: true,
      message: 'Withdrawal initiated successfully.',
      transaction_id: transactionId
    });

  } catch (error) {
    console.error('Withdrawal Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}