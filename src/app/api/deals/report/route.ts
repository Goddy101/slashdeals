import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { deal_id } = await request.json();

    // 1. Get current reports count
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('reports_count, status')
      .eq('id', deal_id)
      .single();

    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    const newReportsCount = (deal.reports_count || 0) + 1;
    
    // GUARDRAIL 4: Auto-Hide logic
    // If it hits 3 reports, instantly remove it from the public feed
    const newStatus = newReportsCount >= 3 ? 'hidden' : deal.status;

    await supabaseAdmin
      .from('deals')
      .update({ reports_count: newReportsCount, status: newStatus })
      .eq('id', deal_id);

    return NextResponse.json({ success: true, hidden: newStatus === 'hidden' });

  } catch (error) {
    return NextResponse.json({ error: 'System error processing report.' }, { status: 500 });
  }
}