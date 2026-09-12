// src/app/api/admin/payouts/approve/route.ts
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Verify that an Admin is making this request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Add a check here to ensure user.email is YOUR admin email
    // if (user.email !== 'admin@slashdeals.com.ng') throw new Error('Forbidden');

    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    // 2. Use Admin client to bypass RLS and update the transaction status
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: 'completed' })
      .eq('id', transaction_id)
      .eq('type', 'withdrawal');

    if (error) {
      console.error('Approval Error:', error);
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}