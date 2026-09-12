import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Security Check: Only allow authorized cron requests
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set target date to "Today" (Assuming cron runs at 12:01 AM)
    const today = new Date();
    const targetDateString = today.toISOString().split('T')[0];

    // 2. Unpin all currently pinned deals from yesterday
    await supabaseAdmin
      .from('deals')
      .update({ is_pinned: false, pinned_rank: null })
      .eq('is_pinned', true);

    // 3. Fetch all pending bids for today, highest amount first. 
    // If amounts tie, the earliest bid wins (created_at ascending).
    const { data: bids } = await supabaseAdmin
      .from('bids')
      .select('*')
      .eq('target_date', targetDateString)
      .eq('status', 'pending')
      .order('amount', { ascending: false })
      .order('created_at', { ascending: true });

    if (!bids || bids.length === 0) {
      return NextResponse.json({ message: 'No bids to resolve today.' });
    }

    // 4. Split into Winners (Top 5) and Losers
    const winners = bids.slice(0, 5);
    const losers = bids.slice(5);

    // 5. Process the Winners
    for (let i = 0; i < winners.length; i++) {
      const bid = winners[i];
      const rank = i + 1;

      // Mark bid as won
      await supabaseAdmin.from('bids').update({ status: 'won', won_rank: rank }).eq('id', bid.id);
      
      // Pin the deal to the homepage
      await supabaseAdmin.from('deals').update({ is_pinned: true, pinned_rank: rank }).eq('id', bid.deal_id);

      // Deduct locked funds permanently (Money belongs to the platform now)
      const { data: profile } = await supabaseAdmin.from('profiles').select('locked_balance').eq('id', bid.merchant_id).single();
      if (profile) {
        await supabaseAdmin.from('profiles')
          .update({ locked_balance: profile.locked_balance - bid.amount })
          .eq('id', bid.merchant_id);
      }

      // Log the transaction
      await supabaseAdmin.from('wallet_transactions').insert([{
        merchant_id: bid.merchant_id, amount: bid.amount, type: 'bid_won_deduction', status: 'success',
        metadata: { deal_id: bid.deal_id, rank }
      }]);
    }

    // 6. Process the Losers (Refunds)
    for (const bid of losers) {
      // Mark bid as lost
      await supabaseAdmin.from('bids').update({ status: 'lost' }).eq('id', bid.id);

      // Return funds from locked_balance to wallet_balance
      const { data: profile } = await supabaseAdmin.from('profiles').select('wallet_balance, locked_balance').eq('id', bid.merchant_id).single();
      if (profile) {
        await supabaseAdmin.from('profiles')
          .update({ 
            locked_balance: profile.locked_balance - bid.amount,
            wallet_balance: profile.wallet_balance + bid.amount 
          })
          .eq('id', bid.merchant_id);
      }

      // Log the refund transaction
      await supabaseAdmin.from('wallet_transactions').insert([{
        merchant_id: bid.merchant_id, amount: bid.amount, type: 'bid_unlock', status: 'success',
        metadata: { deal_id: bid.deal_id, note: 'Auction lost. Funds refunded.' }
      }]);
    }

    return NextResponse.json({ 
      success: true, 
      winners: winners.length, 
      losers: losers.length, 
      target_date: targetDateString 
    });

  } catch (error) {
    console.error('Auction Resolution Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}