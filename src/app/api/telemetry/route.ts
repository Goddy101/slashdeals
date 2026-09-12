// app/api/telemetry/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { listingId, eventType } = await req.json();

    if (!listingId || !['view', 'click', 'checkout_intent'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid telemetry payload' }, { status: 400 });
    }

    // 1. Log the individual event to your timeline table (Your existing logic)
    const { error: analyticsError } = await supabaseAdmin.from('listing_analytics').insert({
      listing_id: listingId,
      event_type: eventType,
    });
    
    if (analyticsError) console.error('Analytics Insert Error:', analyticsError);

    // 2. Atomically update the fast-access counters on the deals table
    if (eventType === 'view') {
      const { error: rpcError } = await supabaseAdmin.rpc('increment_deal_views', {
        p_deal_id: listingId
      });
      if (rpcError) console.error('RPC View Error:', rpcError);
    }
    
    // If you also route clicks through here instead of the separate route:
    
    if (eventType === 'click') {
      await supabaseAdmin.rpc('increment_deal_clicks_simple', {
        p_deal_id: listingId
      });
    }
    

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}








// // app/api/telemetry/route.ts
// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(req: Request) {
//   try {
//     const { listingId, eventType } = await req.json();

//     if (!listingId || !['view', 'click', 'checkout_intent'].includes(eventType)) {
//       return NextResponse.json({ error: 'Invalid telemetry payload' }, { status: 400 });
//     }

//     await supabaseAdmin.from('listing_analytics').insert({
//       listing_id: listingId,
//       event_type: eventType,
//     });

//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }