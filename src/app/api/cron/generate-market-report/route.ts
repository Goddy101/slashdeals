// app/api/cron/generate-market-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CRUCIAL: Prevent Next.js / Vercel from caching the cron route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // 1. Security Check: Verify Vercel Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Aggregate Active Marketplace Data
    const { data: saasData, error: saasError } = await supabase
      .from('listings')
      .select('price, location_slug')
      .eq('category_slug', 'saas-startups')
      .eq('status', 'active');

    if (saasError) throw saasError;

    const { data: escrowData, error: escrowError } = await supabase
      .from('escrows')
      .select('amount')
      .eq('status', 'completed');

    if (escrowError) throw escrowError;

    // 3. Crunch Market Numbers
    const totalSaas = saasData?.length || 0;
    const avgSaasPrice = totalSaas > 0 
      ? saasData.reduce((sum, item) => sum + Number(item.price), 0) / totalSaas 
      : 0;
    
    const totalEscrowVolume = escrowData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    // 4. Generate SEO Metadata & Clean URL Slug
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    const slugDate = now.toISOString().split('T')[0]; // e.g. "2026-08-31"
    const slug = `nigeria-tech-market-report-${slugDate}`;

    // Clean title based on data availability
    const title = avgSaasPrice > 0
      ? `Nigeria Tech Market Report: SaaS Valuations Average ₦${(avgSaasPrice / 1000000).toFixed(1)}M (${monthYear})`
      : `Nigeria Tech Market Report: Digital Assets & Escrow Liquidity Pulse (${monthYear})`;

    // 5. Generate Dynamic Markdown Content with Internal Backlinks
    const markdownContent = `
## The SlashDeals Market Pulse — ${monthYear}

The Nigerian digital asset and high-ticket hardware ecosystem continues to expand. This cycle, the SlashDeals Escrow Vault tracked a cumulative **₦${totalEscrowVolume.toLocaleString()}** in secured transaction volume across completed trades.

### Digital Asset Valuations (SaaS & Micro-Apps)
${totalSaas > 0 
  ? `SaaS startups remain an active digital asset class with **${totalSaas} active listing${totalSaas > 1 ? 's' : ''}** currently on the market. The current average asking valuation stands at **₦${avgSaasPrice.toLocaleString()}**.`
  : `Founders are actively listing micro-SaaS platforms, e-commerce stores, and digital ventures on SlashDeals.`
}

Buyers and founders in Nigeria's leading commercial hubs are actively transacting:
* [Explore SaaS Startups in Lagos](/explore/lagos/saas-startups)
* [Explore SaaS Startups in Abuja](/explore/abuja/saas-startups)
* [Explore Verified Tech Deals in Port Harcourt](/explore/port-harcourt/saas-startups)

### Why Founders & Buyers Transact via Escrow
High-ticket acquisitions demand verified safety. Every deal on SlashDeals is protected by our cryptographic due diligence protocols and 48-hour inspection window before funds leave the escrow vault.

*Looking to exit your software venture or acquire revenue-generating tech? [List your asset today](/submit) to get verified.*
    `;

    // 6. Insert Post (upsert by slug to prevent duplicate posts on same day)
    const { error: insertError } = await supabase
      .from('blog_posts')
      .upsert({
        title,
        slug,
        content: markdownContent.trim(),
        category: 'Market Reports',
        seo_description: `Read the latest Nigerian tech market pulse. Average SaaS startup valuations, digital asset listings, and escrow transaction trends on SlashDeals.`,
        published_at: now.toISOString()
      }, { onConflict: 'slug' });

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: 'Market report published successfully', 
      slug 
    });

  } catch (error: any) {
    console.error('Market Report Cron Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}









// // app/api/cron/generate-market-report/route.ts
// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function GET(request: Request) {
//   // Security Check: Ensure this is only triggered by your verified Cron scheduler
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   try {
//     // 1. Aggregate Market Data
//     const { data: saasData } = await supabase
//       .from('listings')
//       .select('price, location_slug')
//       .eq('category_slug', 'saas-startups')
//       .eq('status', 'active');

//     const { data: escrowData } = await supabase
//       .from('escrows')
//       .select('amount')
//       .eq('status', 'completed');

//     // 2. Crunch the Numbers
//     const totalSaas = saasData?.length || 0;
//     const avgSaasPrice = totalSaas > 0 
//       ? saasData!.reduce((sum, item) => sum + item.price, 0) / totalSaas 
//       : 0;
    
//     const totalEscrowVolume = escrowData?.reduce((sum, item) => sum + item.amount, 0) || 0;

//     // 3. Generate the Automated Markdown Content (with Internal Programmatic Links)
//     const title = `Nigeria Tech Market Report: SaaS Valuations Hit ₦${(avgSaasPrice / 1000000).toFixed(1)}M`;
//     const slug = `nigeria-tech-market-report-${Date.now()}`;
//     const dateStr = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

//     const markdownContent = `
// ## The SlashDeals Market Pulse - ${dateStr}

// The Nigerian digital asset and high-end hardware market continues to see massive liquidity. This week, we tracked a total of **₦${totalEscrowVolume.toLocaleString()}** in safely cleared transaction volume through the SlashDeals 48-Hour Escrow Vault.

// ### Digital Asset Valuations (SaaS & Micro-Apps)
// SaaS startups remain the most lucrative digital asset class. The current average valuation for an active SaaS listing on the platform is **₦${avgSaasPrice.toLocaleString()}**. 

// Founders and buyers in our core tech hubs are highly active:
// * [Explore SaaS Startups in Lagos](/explore/lagos/saas-startups)
// * [Explore SaaS Startups in Abuja](/explore/abuja/saas-startups)

// ### Why Buyers Are Using Escrow
// Unlike traditional classifieds, high-ticket assets require trust. Every transaction in our [Port Harcourt Tech Hub](/explore/port-harcourt/saas-startups) and beyond is secured by our strict cryptographic handover and due diligence protocols. 

// *Looking to exit your startup or sell hardware securely? [List your asset today](/list-asset) and get verified.*
//     `;

//     // 4. Save to Database
//     const { error } = await supabase.from('blog_posts').insert({
//       title,
//       slug,
//       content: markdownContent.trim(),
//       category: 'Market Reports',
//       seo_description: `Weekly tech market report for Nigeria. Average SaaS valuations and secure escrow volume trends on SlashDeals.`
//     });

//     if (error) throw error;

//     return NextResponse.json({ success: true, message: 'Market Report Generated', slug });
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
//   }
// }