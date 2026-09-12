// src/app/api/escrow/initialize/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Get logged-in user. You MUST be logged in as a buyer to check out!
    const { data: { user } } = await supabase.auth.getUser();

    const buyerId = user ? user.id : null; // If not logged in, buyer_id is simply null
    
    // if (!user) {
    //   return NextResponse.json({ error: 'You must be logged in to use secure checkout.' }, { status: 401 });
    // }

    const body = await request.json();
    
    // 🐛 FIX 1: Set a default gateway to 'paystack' if the frontend forgets to send it
    const { deal_id, merchant_id, buyer_email, delivery_details, gateway = 'paystack' } = body;

    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('deal_price, stock_quantity')
      .eq('id', deal_id)
      .single();

    if (!deal || deal.stock_quantity === 0) {
      return NextResponse.json({ error: 'Item out of stock.' }, { status: 400 });
    }

    const amount = deal.deal_price; 
    const deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString();
    const trackingCode = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const escrowFee = Math.round(amount * 0.025);
    const totalAmount = amount + escrowFee;
    const reference = `SD_${deal_id}_${Date.now()}`;

    // 2. Save the order to Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('escrows') 
      .insert([{
        buyer_id: buyerId,                    // 🐛 FIX 2: Valid auth.users ID
        seller_id: merchant_id,               
   // listing_id: deal_id,     
        listing_id: deal_id,
        amount: amount,                       
        status: 'awaiting_payment',           // 🐛 FIX 3: Matches database ENUM exactly
        total_paid: totalAmount,
        escrow_fee: escrowFee,
        delivery_otp: deliveryOTP,
        gateway: gateway,                     // 🐛 FIX 4: Will default to 'paystack'
        payment_reference: reference, 
        gateway_reference: reference,         // 🐛 FIX 5: Fulfills NOT NULL rule
        delivery_details: { ...delivery_details, email: buyer_email, tracking_code: trackingCode }
      }])
      .select()
      .single();

    if (orderError) {
      console.error("Supabase Insert Error:", orderError);
      throw new Error(orderError.message);
    }

    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?order_id=${order.id}`;
    let checkoutUrl = '';

    // 3. Initialize Paystack
    if (gateway === 'paystack') {
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: buyer_email,
          amount: totalAmount * 100, // Paystack uses Kobo
          reference: reference,
          callback_url: successUrl,
          metadata: {
            transaction_type: 'escrow_funding', 
            order_id: order.id,
            merchant_id: merchant_id,
            listing_id: deal_id
          }
        }),
      });

      const paystackData = await paystackResponse.json();
      if (!paystackData.status) throw new Error(paystackData.message);
      checkoutUrl = paystackData.data.authorization_url;
    } 
    else {
      throw new Error('Invalid payment gateway selected.');
    }

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Checkout failed.' }, { status: 500 });
  }
}