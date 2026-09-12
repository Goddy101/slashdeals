// app/api/escrow/verify-otp/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 🔒 1. SECURITY FIX: Get the merchant ID from the secure server session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, otp_attempt } = await request.json();

    if (!order_id || !otp_attempt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔒 2. ATOMIC EXECUTION: Pass to the database to prevent race conditions
    const { data, error: rpcError } = await supabase.rpc('verify_escrow_otp', {
      p_merchant_id: user.id,
      p_escrow_id: order_id,
      p_otp_attempt: otp_attempt
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return NextResponse.json({ error: 'System error processing OTP.' }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, payout: data.payout });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}