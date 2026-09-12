// app/api/escrow/release/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrowId } = await request.json();

    // 1. Trigger the atomic PostgreSQL function to release funds
    const { data, error } = await supabase.rpc('release_escrow_funds', {
      p_escrow_id: escrowId,
      p_buyer_id: user.id
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // ====================================================================
    // 🚀 NEW: INCREMENT THE SELLER'S TRUST SCORE
    // ====================================================================
    
    // We use the Admin client because a buyer doesn't have RLS permission to edit a seller's profile
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the seller ID associated with this escrow
    const { data: escrowRecord } = await supabaseAdmin
      .from('escrows')
      .select('seller_id')
      .eq('id', escrowId)
      .single();

    if (escrowRecord?.seller_id) {
      // Fire the atomic increment RPC we created in the database
      const { error: incrementError } = await supabaseAdmin.rpc('increment_seller_sales', {
        p_seller_id: escrowRecord.seller_id
      });
      
      if (incrementError) {
        console.error("Failed to increment seller trust score:", incrementError);
      }
    }

    return NextResponse.json({ success: true, message: data.message });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}