// app/api/auction/bid/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 🔒 SECURITY FIX: Get the ID from the secure server session, not the body
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, bid_amount, target_date } = await request.json();

    // Align with your database schema check constraint (amount >= 2500)
    const MIN_BID = 2500;
    if (!deal_id || !bid_amount || bid_amount < MIN_BID || !target_date) {
      return NextResponse.json({ error: `Minimum bid is ₦${MIN_BID.toLocaleString()}` }, { status: 400 });
    }

    // 1. Verify deal ownership
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('user_id')
      .eq('id', deal_id)
      .single();

    if (!deal || deal.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only bid using your own deals.' }, { status: 403 });
    }

    // 2. Check profile balance and verification status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance, locked_balance, is_verified')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.wallet_balance < bid_amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
    }

    // GUARDRAIL: Limit unverified accounts to a max bid of ₦5,000
    if (!profile.is_verified && bid_amount > 5000) {
      return NextResponse.json({ 
        error: 'Unverified accounts can bid a maximum of ₦5,000. Please verify your business to place higher bids.' 
      }, { status: 400 });
    }

    // 3. Prevent duplicate active bids for the same deal on the same day
    const { data: existingBid } = await supabaseAdmin
      .from('bids')
      .select('id')
      .eq('deal_id', deal_id)
      .eq('target_date', target_date)
      .eq('status', 'active')
      .maybeSingle();

    if (existingBid) {
      return NextResponse.json({ error: 'You already have an active bid for this deal tomorrow.' }, { status: 400 });
    }

    // 4. Move the money: Deduct from wallet_balance, add to locked_balance
    const newWalletBalance = profile.wallet_balance - bid_amount;
    const newLockedBalance = (profile.locked_balance || 0) + bid_amount;

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newWalletBalance, locked_balance: newLockedBalance })
      .eq('id', user.id);

    if (profileUpdateError) throw profileUpdateError;

    // 5. Record the Bid 
    const { data: bid, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert([{
        merchant_id: user.id,
        deal_id,
        amount: bid_amount,
        target_date,
        status: 'active'
      }])
      .select()
      .single();

    if (bidError) throw bidError;

    // 6. Log the Transaction in the wallet history
    await supabaseAdmin.from('wallet_transactions').insert([{
      merchant_id: user.id,
      amount: bid_amount,
      type: 'bid_lock',
      status: 'completed',
      metadata: { bid_id: bid.id, deal_id, target_date, note: 'Ad Arena Bid Locked' }
    }]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Bidding Error:', error);
    return NextResponse.json({ error: error.message || 'System error processing your bid.' }, { status: 500 });
  }
}






// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(request: Request) {
//   try {
//     const { merchant_id, deal_id, bid_amount, target_date } = await request.json();

//     // Match your frontend's new minimum floor
//     if (bid_amount < 1000) {
//       return NextResponse.json({ error: 'Minimum bid is ₦1,000' }, { status: 400 });
//     }

//     // 1. Check if the merchant has enough Available Balance
//     // 1. Check if the merchant has enough Available Balance and is Verified
//     const { data: profile, error: profileError } = await supabaseAdmin
//       .from('profiles')
//       .select('wallet_balance, locked_balance, is_verified')
//       .eq('id', merchant_id)
//       .single();

//     if (profileError || !profile || profile.wallet_balance < bid_amount) {
//       return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 400 });
//     }

//     // GUARDRAIL 3: Limit unverified accounts to a max bid of ₦5,000
//     if (!profile.is_verified && bid_amount > 5000) {
//       return NextResponse.json({ error: 'Unverified accounts can bid a maximum of ₦5,000. Please verify your business to place higher bids.' }, { status: 400 });
//     }

//     // 2. Prevent duplicate bids for the same deal on the same day
//     const { data: existingBid } = await supabaseAdmin
//       .from('bids') // Matching your frontend table name
//       .select('id')
//       .eq('deal_id', deal_id)
//       .eq('target_date', target_date)
//       .eq('status', 'active')
//       .single();

//     if (existingBid) {
//       return NextResponse.json({ error: 'You already have an active bid for this deal tomorrow.' }, { status: 400 });
//     }

//     // 3. Move the money: Deduct from wallet_balance, add to locked_balance
//     const newWalletBalance = profile.wallet_balance - bid_amount;
//     const newLockedBalance = (profile.locked_balance || 0) + bid_amount;

//     await supabaseAdmin
//       .from('profiles')
//       .update({ wallet_balance: newWalletBalance, locked_balance: newLockedBalance })
//       .eq('id', merchant_id);

//     // 4. Record the Bid 
//     const { data: bid, error: bidError } = await supabaseAdmin
//       .from('bids') // Matching your frontend table name
//       .insert([{
//         merchant_id,
//         deal_id,
//         amount: bid_amount, // Matching your frontend column name
//         target_date,
//         status: 'active'
//       }])
//       .select()
//       .single();

//     if (bidError) throw bidError;

//     // 5. Log the Transaction in the wallet history
//     await supabaseAdmin.from('wallet_transactions').insert([{
//       merchant_id,
//       amount: bid_amount,
//       type: 'bid_lock',
//       status: 'completed',
//       metadata: { bid_id: bid.id, deal_id, target_date, note: 'Ad Arena Bid Locked' }
//     }]);

//     return NextResponse.json({ success: true });

//   } catch (error) {
//     console.error('Bidding Error:', error);
//     return NextResponse.json({ error: 'System error processing your bid.' }, { status: 500 });
//   }
// }