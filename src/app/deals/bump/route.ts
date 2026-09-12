// app/api/bump/apply/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // ⚡ FIX: Added 'await' here since createClient() is now async
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId, tier } = await request.json();

    if (!dealId || !['flash_1h', 'spotlight_24h'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const cost = tier === 'flash_1h' ? 200 : 500;

    // Call atomic RPC function
    const { data, error } = await supabase.rpc('apply_deal_bump', {
      p_user_id: user.id,
      p_deal_id: dealId,
      p_tier: tier,
      p_cost: cost,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tier,
      newBalance: data.new_balance,
      message: tier === 'flash_1h' 
        ? 'Deal bumped to top of feed for 1 hour!' 
        : 'Deal pinned in 24-hour spotlight section!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}