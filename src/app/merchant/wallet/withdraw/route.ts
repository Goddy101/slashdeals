import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { merchant_id, amount, bank_name, account_number } = await request.json();

    if (amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 });
    }

    // 1. Check merchant's available wallet balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', merchant_id)
      .single();

    if (!profile || profile.wallet_balance < amount) {
      return NextResponse.json({ error: 'Insufficient wallet funds.' }, { status: 400 });
    }

    // 2. Deduct the funds from the wallet immediately
    const newBalance = profile.wallet_balance - amount;
    
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', merchant_id);

    // 3. Log the pending withdrawal transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert([{
        merchant_id,
        amount: amount,
        type: 'withdrawal',
        status: 'pending', // You (the admin) will process this via Paystack Transfers
        metadata: { bank_name, account_number, note: 'Bank Withdrawal Request' }
      }])
      .select()
      .single();

    if (txError) throw txError;

    return NextResponse.json({ success: true, newBalance, transaction });

  } catch (error) {
    console.error('Withdrawal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}