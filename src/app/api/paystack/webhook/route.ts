import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role client for secure background database updates
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
    const metadata = paymentData.metadata;

    if (metadata?.type === 'wallet_funding') {
      // Find user profile by email and update wallet balance
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
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}