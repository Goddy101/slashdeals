// src/app/api/cron/auto-release/route.ts
export const dynamic = 'force-dynamic'; // Add this at the top!
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



// Must use Service Role to execute background system tasks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Verify the request is actually coming from Vercel Cron (Security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Find all funded escrows where the inspection window has expired
    const now = new Date().toISOString();
    
    const { data: expiredEscrows, error: fetchError } = await supabaseAdmin
      .from('escrows')
      .select('id, seller_id, amount')
      .eq('status', 'funded')
      .lt('inspection_expires_at', now); // "lt" = strictly less than current time

    if (fetchError) throw fetchError;
    if (!expiredEscrows || expiredEscrows.length === 0) {
      return NextResponse.json({ message: 'No expired escrows found.' });
    }

    let releasedCount = 0;

    // 3. Process each expired escrow using your existing RPC logic
    for (const escrow of expiredEscrows) {
      // You can create a system-level RPC for this, or execute the updates sequentially
      // Since it's a cron job, we wrap it in a custom system release RPC or do it securely here:
      const { error: rpcError } = await supabaseAdmin.rpc('system_auto_release_escrow', {
        p_escrow_id: escrow.id,
        p_merchant_id: escrow.seller_id,
        p_amount: escrow.amount
      });

      if (!rpcError) {
        releasedCount++;
      } else {
        console.error(`Failed to auto-release escrow ${escrow.id}:`, rpcError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Auto-released ${releasedCount} escrows.` 
    });

  } catch (error: any) {
    console.error('Cron Auto-Release Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}