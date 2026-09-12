// app/api/admin/resolve-dispute/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Server-side auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Extra safety check: Ensure the user is actually an admin before proceeding
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { escrowId, resolution } = await request.json();

    // Execute the Admin RPC (Handles the actual money movement in the database)
    const { data, error } = await supabase.rpc('admin_resolve_dispute', {
      p_escrow_id: escrowId,
      p_admin_id: user.id,
      p_resolution: resolution
    });

    if (error) throw error;
    if (!data.success) return NextResponse.json({ error: data.error }, { status: 400 });

    // ====================================================================
    // 🚀 NEW: INCREMENT SELLER SCORE IF ADMIN FORCED PAYOUT
    // ====================================================================
    if (resolution === 'payout_seller') {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Fetch the seller ID
      const { data: escrowRecord } = await supabaseAdmin
        .from('escrows')
        .select('seller_id')
        .eq('id', escrowId)
        .single();

      if (escrowRecord?.seller_id) {
        // Increment the trust score so they don't miss out on leveling up
        const { error: incrementError } = await supabaseAdmin.rpc('increment_seller_sales', {
          p_seller_id: escrowRecord.seller_id
        });

        if (incrementError) {
          console.error("Admin Dispute: Failed to increment seller trust score:", incrementError);
        }
      }
    }

    return NextResponse.json({ success: true, message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}