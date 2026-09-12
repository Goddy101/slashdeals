// app/merchant/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PromoteDealAction from '@/components/PromoteDealAction'; 
import FlyerGeneratorModal from '@/components/FlyerGeneratorModal'; 
import TrafficChart from '@/components/TrafficChart';
import FlyerStudioTrigger from '@/components/merchant/FlyerStudioTrigger';
export const metadata = {
  title: 'Merchant Dashboard | SlashDeals',
};

export default async function MerchantDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 1. Fetch Profile Info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 2. Fetch Deals (Now including views_count)
  const { data: myDeals } = await supabase
    .from('deals')
    .select('id, title, deal_price, status, upvotes_count, clicks_count, views_count, spotlight_expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 3. Fetch Active Ad Campaigns for this merchant
  const { data: myAds } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('merchant_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // --- TRAFFIC METRICS MATH ---
  
  // Organic Stats
  const organicClicks = myDeals?.reduce((sum, deal) => sum + (deal.clicks_count || 0), 0) || 0;
  const organicViews = myDeals?.reduce((sum, deal) => sum + (deal.views_count || 0), 0) || 0;
  const organicCtr = organicViews > 0 
    ? ((organicClicks / organicViews) * 100).toFixed(2) 
    : '0.00';
  
  // Paid Ad Stats
  const totalAdClicks = myAds?.reduce((sum, ad) => sum + (ad.total_clicks || 0), 0) || 0;
  const totalAdViews = myAds?.reduce((sum, ad) => sum + (ad.total_views || 0), 0) || 0;
  const calculatedCtr = totalAdViews > 0 
    ? ((totalAdClicks / totalAdViews) * 100).toFixed(2) 
    : '0.00';

  // --- 📈 BUILD 7-DAY TRAFFIC CHART DATA ---
  const dealIds = myDeals?.map(d => d.id) || [];
  let chartData: { date: string; views: number; clicks: number; fullDate: string }[] = [];
  
  if (dealIds.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days inclusive
    
    // Fetch analytics timeline for views AND clicks
    const { data: analytics } = await supabase
      .from('listing_analytics')
      .select('created_at, event_type')
      .in('listing_id', dealIds)
      .in('event_type', ['view', 'click'])
      .gte('created_at', sevenDaysAgo.toISOString());

    // Initialize array with the last 7 days so empty days show as 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartData.push({ 
        date: d.toLocaleDateString('en-US', { weekday: 'short' }), // "Mon", "Tue"
        views: 0, 
        clicks: 0,
        fullDate: d.toDateString() 
      });
    }

    // Populate the views and clicks
    if (analytics) {
      analytics.forEach(event => {
        const eventDate = new Date(event.created_at).toDateString();
        const dayIndex = chartData.findIndex(day => day.fullDate === eventDate);
        if (dayIndex !== -1) {
          if (event.event_type === 'view') {
            chartData[dayIndex].views += 1;
          } else if (event.event_type === 'click') {
            chartData[dayIndex].clicks += 1;
          }
        }
      });
    }
  }

  const businessName = profile?.business_name || 'My Store';
  const walletBalance = profile?.wallet_balance || 0;
  const isVerified = profile?.is_verified || false;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            Welcome, {businessName}
            {isVerified && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Verified
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Here is how your deals are performing today.</p>
        </div>
        <Link href="/submit" className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-center hover:bg-gray-800 transition-colors">
          + Post New Deal
        </Link>
      </div>

      {/* 👑 Premium B2B Upsell Banner (Only show if they don't have an active ad) */}
      {(!myAds || myAds.length === 0) && (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-800">
          <div>
            <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest mb-3 inline-block">
              Beta Invite
            </span>
            <h3 className="text-2xl font-black text-white flex items-center gap-2">
              Dominate Your Category
            </h3>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm sm:text-base">
              Stop waiting for clicks. Lock down a <strong>Category Monopoly</strong> and display your brand on the sidebar of every single deal in your niche. Only 1 slot available per category.
            </p>
          </div>
          <Link 
            href="/merchant/advertise" 
            className="bg-white text-black px-6 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors whitespace-nowrap shadow-lg flex items-center gap-2"
          >
            View Available Slots <span>🚀</span>
          </Link>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Wallet Balance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-gray-900">₦{walletBalance.toLocaleString()}</h2>
          </div>
          <Link href="/merchant/wallet" className="text-sm text-blue-600 font-medium hover:underline mt-4 inline-block">
            Fund Wallet →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-bold text-gray-500 uppercase">Active Deals</p>
          <h2 className="text-3xl font-black text-gray-900 mt-2">{myDeals?.length || 0}</h2>
          <p className="text-sm text-gray-500 mt-4">Currently live on the board</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <p className="text-sm font-bold text-amber-700 uppercase">Ad Auction Status</p>
          <h2 className="text-xl font-black text-gray-900 mt-2">Active Bidding</h2>
          <Link href="/merchant/auction" className="text-sm text-amber-700 font-medium hover:underline mt-4 inline-block">
            View Live Placements →
          </Link>
        </div>
      </div>

      {/* 🚀 Traffic & Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Organic Traffic Performance */}
        <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-1">
                Organic Traffic Clicks
              </p>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900">
                {organicClicks.toLocaleString()}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-1">
                Average CTR
              </p>
              <div className="inline-block bg-gray-100 text-gray-700 font-black text-xl px-3 py-1 rounded-xl shadow-sm border border-gray-200">
                {organicCtr}%
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-4 flex justify-between items-end">
            <p className="text-sm text-gray-500">
              From {organicViews.toLocaleString()} total organic views.
            </p>
          </div>
        </div>

        {/* Card 2: Paid Ad Performance & CTR */}
        <div className="bg-blue-600 text-white p-6 sm:p-8 rounded-xl shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-blue-200 font-bold uppercase tracking-wider text-sm mb-1">
                Ad Campaign Clicks
              </p>
              <h1 className="text-4xl sm:text-5xl font-black text-white">
                {totalAdClicks.toLocaleString()}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-blue-200 font-bold uppercase tracking-wider text-xs mb-1">
                Average CTR
              </p>
              <div className="inline-block bg-white text-blue-700 font-black text-xl px-3 py-1 rounded-xl shadow-sm">
                {calculatedCtr}%
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-4 flex justify-between items-end">
            <p className="text-sm text-blue-100">
              From {totalAdViews.toLocaleString()} total ad views.
            </p>
            <Link href="/merchant/advertise" className="text-sm font-bold text-white hover:text-blue-200 underline">
              Run new ad &rarr;
            </Link>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </div>

      {/* 📈 7-Day Traffic Trend */}
      {dealIds.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-gray-900">Traffic Trend</h3>
              <p className="text-sm text-gray-500 mt-1">Organic views and clicks across all your active deals (Last 7 Days)</p>
            </div>
            <Link href="/merchant/auction" className="text-sm font-bold text-blue-600 hover:underline">
              Boost Traffic →
            </Link>
          </div>
          <TrafficChart data={chartData} />
        </div>
      )}

      {/* Ad Campaign Performance Tracker */}
      {myAds && myAds.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden mb-8">
          <div className="bg-blue-50 border-b border-blue-100 p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
                🚀 Active Category Monopolies
              </h3>
              <p className="text-sm text-blue-700">Track your exclusive advertising ROI.</p>
            </div>
            <Link href="/merchant/advertise" className="text-sm font-bold text-blue-600 hover:underline">
              Buy Another Slot →
            </Link>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6">
              {myAds.map((ad: any) => {
                const ctr = ad.total_views > 0 
                  ? ((ad.total_clicks / ad.total_views) * 100).toFixed(2) 
                  : '0.00';
                
                const daysLeft = Math.ceil((new Date(ad.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                return (
                  <div key={ad.id} className="border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 bg-gray-50">
                    <img src={ad.image_url} alt="Ad banner" className="w-24 h-24 object-cover rounded-xl shadow-sm" />
                    
                    <div className="flex-1 space-y-1 text-center md:text-left w-full">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest inline-block w-fit">
                          {ad.category} Monopoly
                        </span>
                        <span className={`text-xs font-bold ${daysLeft > 5 ? 'text-green-600' : 'text-red-500'}`}>
                          {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg">{ad.headline}</h4>
                    </div>

                    <div className="flex items-center justify-between gap-8 w-full md:w-auto bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Views</p>
                        <p className="text-2xl font-black text-gray-900">{ad.total_views || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Clicks</p>
                        <p className="text-2xl font-black text-blue-600">{ad.total_clicks || 0}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CTR</p>
                        <p className="text-2xl font-black text-emerald-500">{ctr}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Deals Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Your Recent Deals</h3>
        </div>
        
        {(!myDeals || myDeals.length === 0) ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">You haven't posted any deals yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Deal Title</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Upvotes</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myDeals.map((deal) => {
                  const now = new Date();
                  const isSpotlightActive = deal.spotlight_expires_at && new Date(deal.spotlight_expires_at) > now;
                  
                  return (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">
                        {deal.title}
                      </td>
                      <td className="px-6 py-4">
                        ₦{deal.deal_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {deal.upvotes_count}
                      </td>
                      <td className="px-6 py-4">
                        {isSpotlightActive ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">⭐ Spotlight</span>
                        ) : deal.status === 'active' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{deal.status}</span>
                        )}
                      </td>
                      {/* <td className="px-6 py-4 flex justify-end">
                        <PromoteDealAction 
                          dealId={deal.id} 
                          dealTitle={deal.title} 
                          currentBalance={walletBalance} 
                        />
                      </td> */}

                      <td className="px-6 py-4 flex items-center justify-end gap-2">
  
  {/* NEW: The Flyer Generator Button */}
  <FlyerStudioTrigger dealId={deal.id} />

  {/* EXISTING: Your Promote Deal Button */}
  <PromoteDealAction 
    dealId={deal.id} 
    dealTitle={deal.title} 
    currentBalance={walletBalance} 
  />
  
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}






// // app/merchant/dashboard/page.tsx
// import { createClient } from '@/lib/supabase/server';
// import { redirect } from 'next/navigation';
// import Link from 'next/link';
// import PromoteDealAction from '@/components/PromoteDealAction'; 
// import FlyerGeneratorModal from '@/components/FlyerGeneratorModal'; 

// export const metadata = {
//   title: 'Merchant Dashboard | SlashDeals',
// };

// export default async function MerchantDashboard() {
//   const supabase = await createClient();

//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) {
//     redirect('/login');
//   }

//   // 1. Fetch Profile Info
//   const { data: profile } = await supabase
//     .from('profiles')
//     .select('*')
//     .eq('id', user.id)
//     .single();

//   // // 2. Fetch Deals
//   // const { data: myDeals } = await supabase
//   //   .from('deals')
//   //   .select('*')
//   //   .eq('user_id', user.id)
//   //   .order('created_at', { ascending: false });


//   // 2. Fetch Deals (Now including views_count)
// const { data: myDeals } = await supabase
//   .from('deals')
//   .select('id, title, deal_price, status, upvotes_count, clicks_count, views_count, spotlight_expires_at') // Added views_count here
//   .eq('user_id', user.id)
//   .order('created_at', { ascending: false });

// // Calculate Organic Stats
// const organicClicks = myDeals?.reduce((sum, deal) => sum + (deal.clicks_count || 0), 0) || 0;
// const organicViews = myDeals?.reduce((sum, deal) => sum + (deal.views_count || 0), 0) || 0;

// const organicCtr = organicViews > 0 
//   ? ((organicClicks / organicViews) * 100).toFixed(2) 
//   : '0.00';

//   // 3. Fetch Active Ad Campaigns for this merchant
//   const { data: myAds } = await supabase
//     .from('ad_campaigns')
//     .select('*')
//     .eq('merchant_id', user.id)
//     .eq('status', 'active')
//     .order('created_at', { ascending: false });

//   // --- NEW: CALCULATE TRAFFIC METRICS ON THE SERVER ---
//   const organicClicks = myDeals?.reduce((sum, deal) => sum + (deal.clicks_count || 0), 0) || 0;
  
//   const totalAdClicks = myAds?.reduce((sum, ad) => sum + (ad.total_clicks || 0), 0) || 0;
//   const totalAdViews = myAds?.reduce((sum, ad) => sum + (ad.total_views || 0), 0) || 0;
//   const calculatedCtr = totalAdViews > 0 
//     ? ((totalAdClicks / totalAdViews) * 100).toFixed(2) 
//     : '0.00';

//   const businessName = profile?.business_name || 'My Store';
//   const walletBalance = profile?.wallet_balance || 0;
//   const isVerified = profile?.is_verified || false;

//   return (
//     <div className="max-w-5xl mx-auto space-y-8">
      
//       {/* Header Section */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
//             Welcome, {businessName}
//             {isVerified && (
//               <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
//                 Verified
//               </span>
//             )}
//           </h1>
//           <p className="text-gray-500 mt-1">Here is how your deals are performing today.</p>
//         </div>
//         <Link href="/submit" className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-center hover:bg-gray-800 transition-colors">
//           + Post New Deal
//         </Link>
//       </div>

//       {/* 👑 Premium B2B Upsell Banner (Only show if they don't have an active ad) */}
//       {(!myAds || myAds.length === 0) && (
//         <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-800">
//           <div>
//             <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest mb-3 inline-block">
//               Beta Invite
//             </span>
//             <h3 className="text-2xl font-black text-white flex items-center gap-2">
//               Dominate Your Category
//             </h3>
//             <p className="text-gray-400 mt-2 max-w-2xl text-sm sm:text-base">
//               Stop waiting for clicks. Lock down a <strong>Category Monopoly</strong> and display your brand on the sidebar of every single deal in your niche. Only 1 slot available per category.
//             </p>
//           </div>
//           <Link 
//             href="/merchant/advertise" 
//             className="bg-white text-black px-6 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors whitespace-nowrap shadow-lg flex items-center gap-2"
//           >
//             View Available Slots <span>🚀</span>
//           </Link>
//         </div>
//       )}

//       {/* Top Metrics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
//           <p className="text-sm font-bold text-gray-500 uppercase">Wallet Balance</p>
//           <div className="mt-2 flex items-baseline gap-2">
//             <h2 className="text-3xl font-black text-gray-900">₦{walletBalance.toLocaleString()}</h2>
//           </div>
//           <Link href="/merchant/wallet" className="text-sm text-blue-600 font-medium hover:underline mt-4 inline-block">
//             Fund Wallet →
//           </Link>
//         </div>

//         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
//           <p className="text-sm font-bold text-gray-500 uppercase">Active Deals</p>
//           <h2 className="text-3xl font-black text-gray-900 mt-2">{myDeals?.length || 0}</h2>
//           <p className="text-sm text-gray-500 mt-4">Currently live on the board</p>
//         </div>

//         <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50 to-white">
//           <p className="text-sm font-bold text-amber-700 uppercase">Ad Auction Status</p>
//           <h2 className="text-xl font-black text-gray-900 mt-2">Active Bidding</h2>
//           <Link href="/merchant/auction" className="text-sm text-amber-700 font-medium hover:underline mt-4 inline-block">
//             View Live Placements →
//           </Link>
//         </div>
//       </div>

//       {/* 🚀 NEW: Traffic & Performance Metrics */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Card 1: Organic Deal Clicks */}
//         <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
//           <div className="relative z-10 flex justify-between items-start">
//             <div>
//               <p className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-1">
//                 Organic Deal Clicks
//               </p>
//               <h1 className="text-4xl sm:text-5xl font-black text-gray-900">
//                 {organicClicks.toLocaleString()}
//               </h1>
//             </div>
//             <div className="bg-gray-100 text-gray-500 p-3 rounded-2xl">
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
//               </svg>
//             </div>
//           </div>
//           <div className="relative z-10 mt-4">
//             <p className="text-sm text-gray-500">Free traffic to your posted deals.</p>
//           </div>
//         </div>

//         {/* Card 2: Paid Ad Performance & CTR */}
//         <div className="bg-blue-600 text-white p-6 sm:p-8 rounded-xl shadow-md relative overflow-hidden flex flex-col justify-between">
//           <div className="relative z-10 flex justify-between items-start">
//             <div>
//               <p className="text-blue-200 font-bold uppercase tracking-wider text-sm mb-1">
//                 Ad Campaign Clicks
//               </p>
//               <h1 className="text-4xl sm:text-5xl font-black text-white">
//                 {totalAdClicks.toLocaleString()}
//               </h1>
//             </div>
//             <div className="text-right">
//               <p className="text-blue-200 font-bold uppercase tracking-wider text-xs mb-1">
//                 Average CTR
//               </p>
//               <div className="inline-block bg-white text-blue-700 font-black text-xl px-3 py-1 rounded-xl shadow-sm">
//                 {calculatedCtr}%
//               </div>
//             </div>
//           </div>
//           <div className="relative z-10 mt-4 flex justify-between items-end">
//             <p className="text-sm text-blue-100">
//               From {totalAdViews.toLocaleString()} total ad views.
//             </p>
//             <Link href="/merchant/advertise" className="text-sm font-bold text-white hover:text-blue-200 underline">
//               Run new ad &rarr;
//             </Link>
//           </div>
//           <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
//         </div>
//       </div>

//       {/* Ad Campaign Performance Tracker */}
//       {myAds && myAds.length > 0 && (
//         <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden mb-8">
//           <div className="bg-blue-50 border-b border-blue-100 p-6 flex justify-between items-center">
//             <div>
//               <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
//                 🚀 Active Category Monopolies
//               </h3>
//               <p className="text-sm text-blue-700">Track your exclusive advertising ROI.</p>
//             </div>
//             <Link href="/merchant/advertise" className="text-sm font-bold text-blue-600 hover:underline">
//               Buy Another Slot →
//             </Link>
//           </div>
          
//           <div className="p-6">
//             <div className="grid grid-cols-1 gap-6">
//               {myAds.map((ad: any) => {
//                 const ctr = ad.total_views > 0 
//                   ? ((ad.total_clicks / ad.total_views) * 100).toFixed(2) 
//                   : '0.00';
                
//                 const daysLeft = Math.ceil((new Date(ad.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

//                 return (
//                   <div key={ad.id} className="border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 bg-gray-50">
//                     <img src={ad.image_url} alt="Ad banner" className="w-24 h-24 object-cover rounded-xl shadow-sm" />
                    
//                     <div className="flex-1 space-y-1 text-center md:text-left w-full">
//                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
//                         <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest inline-block w-fit">
//                           {ad.category} Monopoly
//                         </span>
//                         <span className={`text-xs font-bold ${daysLeft > 5 ? 'text-green-600' : 'text-red-500'}`}>
//                           {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
//                         </span>
//                       </div>
//                       <h4 className="font-bold text-gray-900 text-lg">{ad.headline}</h4>
//                     </div>

//                     <div className="flex items-center justify-between gap-8 w-full md:w-auto bg-white p-4 rounded-xl border border-gray-200">
//                       <div className="text-center">
//                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Views</p>
//                         <p className="text-2xl font-black text-gray-900">{ad.total_views || 0}</p>
//                       </div>
//                       <div className="text-center">
//                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Clicks</p>
//                         <p className="text-2xl font-black text-blue-600">{ad.total_clicks || 0}</p>
//                       </div>
//                       <div className="text-center hidden sm:block">
//                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CTR</p>
//                         <p className="text-2xl font-black text-emerald-500">{ctr}%</p>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Recent Deals Table */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-gray-200">
//           <h3 className="text-lg font-bold text-gray-900">Your Recent Deals</h3>
//         </div>
        
//         {(!myDeals || myDeals.length === 0) ? (
//           <div className="p-10 text-center">
//             <p className="text-gray-500">You haven't posted any deals yet.</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm">
//               <thead className="bg-gray-50 text-gray-500">
//                 <tr>
//                   <th className="px-6 py-3 font-medium">Deal Title</th>
//                   <th className="px-6 py-3 font-medium">Price</th>
//                   <th className="px-6 py-3 font-medium">Upvotes</th>
//                   <th className="px-6 py-3 font-medium">Status</th>
//                   <th className="px-6 py-3 font-medium text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {myDeals.map((deal) => {
//                   const now = new Date();
//                   const isSpotlightActive = deal.spotlight_expires_at && new Date(deal.spotlight_expires_at) > now;
                  
//                   return (
//                     <tr key={deal.id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">
//                         {deal.title}
//                       </td>
//                       <td className="px-6 py-4">
//                         ₦{deal.deal_price.toLocaleString()}
//                       </td>
//                       <td className="px-6 py-4 text-gray-500">
//                         {deal.upvotes_count}
//                       </td>
//                       <td className="px-6 py-4">
//                         {isSpotlightActive ? (
//                           <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">⭐ Spotlight</span>
//                         ) : deal.status === 'active' ? (
//                           <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>
//                         ) : (
//                           <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{deal.status}</span>
//                         )}
//                       </td>
//                       <td className="px-6 py-4 flex justify-end">
//                         <PromoteDealAction 
//                           dealId={deal.id} 
//                           dealTitle={deal.title} 
//                           currentBalance={walletBalance} 
//                         />
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//     </div>
//   );
// }





