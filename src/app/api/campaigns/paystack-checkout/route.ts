// app/api/campaigns/paystack-checkout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch user email for Paystack receipt
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();

    const { categoryId, price, headline, imageUrl, dealLink } = await request.json();

    // Initialize Paystack Transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: price * 100, // Paystack requires kobo/cents
        callback_url: `${process.env.NEXT_SITE_URL}/merchant/advertise/success`,
        metadata: {
          transaction_type: 'ad_purchase', // 🚀 Tells your webhook how to handle this
          merchant_id: user.id,
          category_id: categoryId,
          headline: headline,
          image_url: imageUrl,
          deal_link: dealLink
        }
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, checkoutUrl: paystackData.data.authorization_url });

  } catch (error: any) {
    console.error('Paystack Init Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}