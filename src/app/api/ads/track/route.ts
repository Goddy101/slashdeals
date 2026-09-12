// src/app/api/ads/track/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Admin key to bypass RLS and securely increment the counts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { campaignId, type } = await req.json();

    if (!campaignId || !['view', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Call the SQL RPC functions we just created
    const rpcFunction = type === 'view' ? 'increment_ad_views' : 'increment_ad_clicks';
    
    const { error } = await supabaseAdmin.rpc(rpcFunction, {
      campaign_id: campaignId
    });

    if (error) {
      console.error(`Error tracking ad ${type}:`, error);
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}