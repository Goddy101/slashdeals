// src/app/api/campaigns/checkout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify the merchant is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch their profile to get the email for Paystack
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const body = await req.json();
    const { categoryId, price, headline, imageUrl, dealLink } = body;

    // 2. Initialize the Paystack Transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: price * 100, // Paystack expects amount in kobo
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/merchant/advertise/success`,
        metadata: {
          custom_fields: [
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: "ad_campaign_monopoly"
            }
          ],
          // We pack all the ad details safely into the transaction!
          campaign_details: {
            merchant_id: user.id,
            category: categoryId,
            headline: headline,
            image_url: imageUrl,
            target_url: dealLink
          }
        }
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    // 3. Return the secure checkout URL to the frontend
    return NextResponse.json({ 
      checkoutUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });

  } catch (error: any) {
    console.error('Ad Checkout API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}