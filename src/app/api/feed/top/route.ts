import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; 

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: topDeals, error } = await supabase
    .from('deals')
    .select('id, title, deal_price, original_price, category, deal_url, profiles(business_name)')
    .eq('is_pinned', true)
    .order('pinned_rank', { ascending: true })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Format cleanly for external consumers and LLMs
  const feed = topDeals?.map(deal => {
    
    // 1. Safely handle the joined profile object 
    // (Supabase typings sometimes infer relationships as arrays)
    const profile = Array.isArray(deal.profiles) ? deal.profiles[0] : deal.profiles;
    const merchantName = profile?.business_name || 'Verified Merchant';

    // 2. Safely calculate discount to avoid NaN or Infinity crashes
    let discount = 0;
    if (deal.original_price && deal.deal_price && deal.original_price > 0) {
        discount = Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100);
    }

    return {
      merchant: merchantName,
      offer: deal.title,
      current_price_ngn: deal.deal_price,
      discount_percentage: discount,
      claim_link: `https://slashdeals.com.ng/deal/${deal.id}`,
      category: deal.category
    };
  });

  return NextResponse.json(
    { 
      platform: "SlashDeals",
      timestamp: new Date().toISOString(),
      top_deals: feed || [] 
    },
    { 
      headers: {
        'Access-Control-Allow-Origin': '*', // Allows blogs to fetch this via JS
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache for 1 hour
      }
    }
  );
}






// import { NextResponse } from 'next/server';
// import { supabase } from '@/lib/supabase/server';

// export async function GET(request: Request) {
//   // Fetch today's paid/pinned deals first
//   const { data: topDeals, error } = await supabase
//     .from('deals')
//     .select('id, title, deal_price, original_price, category, deal_url, profiles(business_name)')
//     .eq('is_pinned', true)
//     .order('pinned_rank', { ascending: true })
//     .limit(5);

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 });

//   // Format cleanly for external consumers and LLMs
//   const feed = topDeals.map(deal => ({
//     merchant: deal.profiles.business_name,
//     offer: deal.title,
//     current_price_ngn: deal.deal_price,
//     discount_percentage: Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100),
//     claim_link: `https://slashdeals.com.ng/deal/${deal.id}`,
//     category: deal.category
//   }));

//   return NextResponse.json(
//     { 
//       platform: "SlashDeals",
//       timestamp: new Date().toISOString(),
//       top_deals: feed 
//     },
//     { 
//       headers: {
//         'Access-Control-Allow-Origin': '*', // Allows blogs to fetch this via JS
//         'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache for 1 hour
//       }
//     }
//   );
// }


