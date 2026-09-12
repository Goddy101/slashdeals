// app/api/campaigns/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the Service Role key here because financial deductions and 
// system-level updates should bypass Row Level Security (RLS) safely.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SPOTLIGHT_COST = 1000; // ₦1,000 for a 24-hour boost

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { merchant_id, deal_id, category, image_url, headline } = body;

    if (!merchant_id || !deal_id || !category) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Verify Deal Ownership & Status
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('user_id, status')
      .eq('id', deal_id)
      .single();

    if (dealError || !deal || deal.user_id !== merchant_id) {
      return NextResponse.json({ error: 'Deal not found or unauthorized.' }, { status: 403 });
    }

    // 2. Check Wallet Balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', merchant_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Merchant profile not found.' }, { status: 404 });
    }

    if (profile.wallet_balance < SPOTLIGHT_COST) {
      return NextResponse.json({ error: 'Insufficient wallet balance. Please top up.' }, { status: 400 });
    }

    // 3. Deduct Funds (Database CHECK constraint prevents negative balance)
    const newBalance = Number(profile.wallet_balance) - SPOTLIGHT_COST;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', merchant_id);

    if (deductError) {
      throw new Error('Failed to process payment deduction.');
    }

    // 4. Log the Transaction for the Merchant's Dashboard
    await supabase.from('wallet_transactions').insert([{
      merchant_id,
      amount: SPOTLIGHT_COST,
      type: 'bid_won_deduction', // Reusing this enum for ad payments based on your schema
      status: 'success',
      metadata: { description: '24-Hour Flash Spotlight', deal_id }
    }]);

    // 5. Create the Ad Campaign Record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Add 24 hours

    const { error: campaignError } = await supabase.from('ad_campaigns').insert([{
      merchant_id,
      category,
      linked_deal_id: deal_id,
      image_url: image_url || '',
      headline: headline || 'Sponsored Deal',
      status: 'active',
      expires_at: expiresAt.toISOString()
    }]);

    if (campaignError) console.error("Campaign Creation Error:", campaignError);

    // 6. Update the actual Deal to reflect pinned status in the feed
    await supabase.from('deals')
      .update({
        is_pinned: true,
        spotlight_expires_at: expiresAt.toISOString()
      })
      .eq('id', deal_id);

    // Optional: Trigger Telegram Webhook here to announce the sponsored deal

    return NextResponse.json({ 
      success: true, 
      message: 'Spotlight activated successfully!',
      new_balance: newBalance
    });

  } catch (err: any) {
    console.error('Campaign Error:', err);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}