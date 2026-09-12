// app/api/flyer/purchase/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId } = await request.json();

    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // 🔒 SECURITY: Hardcode the price here so the client cannot spoof it
    const MICRO_TRANSACTION_COST = 300;

    // Trigger the atomic deduction
    const { data, error } = await supabase.rpc('purchase_digital_flyer', {
      p_user_id: user.id,
      p_deal_id: dealId,
      p_cost: MICRO_TRANSACTION_COST,
    });

    if (error) {
      return NextResponse.json({ error: 'Transaction failed at the database level' }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Successfully purchased
    return NextResponse.json({
      success: true,
      newBalance: data.new_balance,
      message: 'Payment verified. Generating flyer...'
    });
    
  } catch (err: any) {
    console.error('Flyer Purchase Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}