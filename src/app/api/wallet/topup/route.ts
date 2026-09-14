// app/api/wallet/topup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1000) {
      return NextResponse.json({ error: 'Minimum top-up is ₦1,000' }, { status: 400 });
    }

    // Get merchant email for Paystack
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const reference = `TOPUP_${user.id}_${Date.now()}`;

    // Initialize Paystack Transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: amount * 100, // Paystack uses Kobo
        reference: reference,
        callback_url: `${process.env.NEXT_SITE_URL}/merchant/wallet?topup=success`,
        metadata: {
          transaction_type: 'wallet_topup',
          merchant_id: user.id
        }
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message);
    }

    return NextResponse.json({ authorization_url: paystackData.data.authorization_url });
  } catch (err: any) {
    console.error('Topup Init Error:', err);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}