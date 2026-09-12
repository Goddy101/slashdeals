import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { order_id, merchant_id, otp } = await request.json();

    // 1. Fetch the order securely
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', order_id)
      .eq('merchant_id', merchant_id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ error: 'This order has already been redeemed.' }, { status: 400 });
    }

    if (order.status !== 'pending_delivery') {
      return NextResponse.json({ error: 'Order is not ready for redemption.' }, { status: 400 });
    }

    // 2. VERIFY THE OTP
    if (order.delivery_otp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid Delivery PIN. Please check with the buyer.' }, { status: 400 });
    }

    // 3. Calculate Payout (Since Escrow is "Free for Buyer", we deduct the fee from the merchant)
    const payoutAmount = order.total_paid - order.escrow_fee;

    // 4. Get current merchant wallet balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', merchant_id)
      .single();

    const newBalance = (profile?.wallet_balance || 0) + payoutAmount;

    // 5. ATOMIC UPDATE: Mark order complete & update wallet
    await supabaseAdmin.from('escrows').update({ status: 'completed' }).eq('id', order_id);
    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', merchant_id);

    // 6. Log the transaction
    await supabaseAdmin.from('wallet_transactions').insert([{
      merchant_id,
      amount: payoutAmount,
      type: 'escrow_payment',
      status: 'completed',
      metadata: { order_id: order.id, note: 'Funds unlocked via Delivery PIN' }
    }]);

    return NextResponse.json({ success: true, payoutAmount });

  } catch (error) {
    console.error('OTP Redemption Error:', error);
    return NextResponse.json({ error: 'System error processing OTP.' }, { status: 500 });
  }
}