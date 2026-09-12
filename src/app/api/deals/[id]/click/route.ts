// app/api/deals/[id]/click/route.ts
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;
    const headers = request.headers;
    
    // Extract basic analytics data
    const ip = headers.get('x-forwarded-for') || 'unknown_ip';
    const userAgent = headers.get('user-agent') || 'unknown_device';
    const referrer = headers.get('referer') || 'direct';

    // Hash the IP to protect user privacy while still allowing unique click tracking
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Initialize Admin client to bypass RLS for analytics logging
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Trigger the atomic database function
    const { error } = await supabaseAdmin.rpc('increment_deal_clicks', {
      p_deal_id: dealId,
      p_ip_hash: ipHash,
      p_referrer: referrer,
      p_user_agent: userAgent
    });

    if (error) {
      console.error('RPC Click Error:', error);
      return NextResponse.json({ error: 'Failed to log click' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Click Tracking Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}









// import { NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// export async function GET(request: Request, { params }: { params: { id: string } }) {
//   const supabase = createClient();
//   const dealId = params.id;

//   // 1. Fetch the deal to get the target URL and current click count
//   const { data: deal, error } = await supabase
//     .from('deals')
//     .select('deal_url, clicks_count')
//     .eq('id', dealId)
//     .single();

//   // If the deal doesn't exist, safely send them back to the homepage
//   if (error || !deal) {
//     return NextResponse.redirect(new URL('/', request.url));
//   }

//   // 2. Silently increment the click counter in the background
//   // (We don't await this so it doesn't slow down the user's redirect)
//   supabase
//     .from('deals')
//     .update({ clicks_count: (deal.clicks_count || 0) + 1 })
//     .eq('id', dealId)
//     .then();

//   // 3. Instantly redirect the user to the merchant's page
//   return NextResponse.redirect(deal.deal_url);
// }