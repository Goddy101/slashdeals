// app/api/escrow/handover/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrowId, credentials } = await request.json();

    // 1. Verify ownership and current status
    // 🚨 FIXED: Changed merchant_id to seller_id to match your database schema
    const { data: escrow, error: fetchError } = await supabase
      .from('escrows')
      .select('seller_id, status')
      .eq('id', escrowId)
      .single();

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }
    
    if (escrow.seller_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    if (escrow.status !== 'awaiting_seller') {
      return NextResponse.json({ error: 'Invalid escrow state' }, { status: 400 });
    }

    // 2. Update status to inspection and save credentials
    // Note: Over HTTPS and with Supabase RLS, this is reasonably secure for an MVP.
    const { error: updateError } = await supabase
      .from('escrows')
      .update({
        asset_credentials: credentials,
        status: 'inspection',
        inspection_started_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Credentials handed over successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}