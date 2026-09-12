// src/app/api/wallet/withdraw/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 🔒 SECURITY FIX 1: Never trust the client body. Get the ID from the secure session.
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, bank_name, account_number, bank_code } = await request.json();

    if (amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 });
    }

    if (!bank_name || !account_number) {
      return NextResponse.json({ error: 'Bank details are required' }, { status: 400 });
    }

    // Initialize the Admin client to securely bypass RLS for financial transactions
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔒 SECURITY FIX 2: Trigger the atomic database function with EXACT parameter names
    const { data, error } = await supabaseAdmin.rpc('request_withdrawal', {
      merch_id: user.id,
      withdraw_amount: amount,
      b_name: bank_name,
      b_code: bank_code, // Ensure you have a way to get the bank code from the bank name
      acct_num: account_number
    });

    if (error) {
      console.error('RPC Error:', error.message);
      
      // Catch our specific SQL exception and send a clean error to the frontend
      if (error.message.includes('Insufficient')) {
        return NextResponse.json({ error: 'Insufficient wallet funds.' }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Transaction failed at the database level' }, { status: 500 });
    }

    // Successfully locked the withdrawal request!
    return NextResponse.json({ 
      success: true,
      transaction_id: data.transaction_id
    });

  } catch (error) {
    console.error('Withdrawal Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}