import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import https from 'https';

export async function POST(request: Request) {
  try {
    const { email, amount, metadata } = await request.json();
    const supabase = await createClient();
   // const supabase = createClient();

    // Verify user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = JSON.stringify({
      email,
      amount: amount * 100, // Paystack expects amount in kobo
      callback_url: `${process.env.NEXT_SITE_URL || 'http://localhost:3000'}/merchant/wallet`,
      metadata,
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const paystackPromise = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(JSON.parse(data)); });
      });
      req.on('error', (error) => { reject(error); });
      req.write(params);
      req.end();
    });

    const response: any = await paystackPromise;

    if (!response.status) {
      return NextResponse.json({ error: response.message || 'Payment initialization failed' }, { status: 400 });
    }

    return NextResponse.json({ authorization_url: response.data.authorization_url });

  } catch (err: any) {
    console.error('Paystack init error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}