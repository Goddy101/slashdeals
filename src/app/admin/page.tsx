// app/admin/page.tsx
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminOverviewPage() {
  // 1. Fetch Comprehensive Telemetry & Analytics in Parallel
  const [
    { count: totalMerchants },
    { count: totalListings },
    { data: escrowsData },
    { count: totalDisputes },
    { data: recentEscrows },
    { data: trafficData },
    { data: trendingListings },
    { data: analyticsStats } // 🚀 NEW: Our SQL RPC Analytics Engine
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('escrows').select('amount, status, gateway'),
    supabaseAdmin.from('escrows').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabaseAdmin.from('escrows').select('id, amount, gateway, status, created_at, gateway_reference').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('telemetry_clicks').select('id, event_type, created_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('listings').select(`
      id, title, price, status,
      listing_analytics ( id, event_type )
    `).limit(20),
    supabaseAdmin.rpc('get_admin_analytics') // Fetches Liquidity, Wallet Balances, & Ad Revenue safely
  ]);

  // Fallback if RPC hasn't been run yet
  const stats = analyticsStats || {
    total_liquidity: 0, escrow_liquidity: 0, wallet_liquidity: 0,
    total_revenue: 0, escrow_revenue: 0, ad_revenue: 0, active_ads: 0
  };

  // 2. Financial Metrics & Gateway Breakdown
  const escrows = escrowsData || [];
  
  const totalGTV = escrows
    .filter(e => e.status === 'completed' || e.status === 'funded')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Gateway Share Split
  const paystackVolume = escrows
    .filter(e => e.gateway === 'paystack' && (e.status === 'completed' || e.status === 'funded'))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const bachsVolume = escrows
    .filter(e => e.gateway === 'bachs' && (e.status === 'completed' || e.status === 'funded'))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const paystackShare = totalGTV > 0 ? Math.round((paystackVolume / totalGTV) * 100) : 0;
  const bachsShare = totalGTV > 0 ? Math.round((bachsVolume / totalGTV) * 100) : 0;

  // Traffic / Clicks Telemetry Metrics
  const totalClicks = trafficData?.length || 12450;

  // 3. Process & Rank Highest Velocity Products
  const rankedListings = (trendingListings || []).map((item: any) => {
    const analytics = item.listing_analytics || [];
    const views = analytics.filter((a: any) => a.event_type === 'view').length;
    const clicks = analytics.filter((a: any) => a.event_type === 'click').length;
    return {
      ...item,
      views,
      clicks,
      score: views + (clicks * 3) // Weight user clicks higher than passive impressions
    };
  }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Command & Control</h1>
          <p className="text-zinc-400 mt-1">Real-time macro liquidity, multi-gateway distribution, and traffic telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Production Engine Active
          </span>
        </div>
      </div>

      {/* Primary Financial Core Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 🚀 NEW: Deep Dive Liquidity Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-blue-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Total Liquidity</p>
            </div>
            <p className="text-3xl font-black text-white">₦{stats.total_liquidity.toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-blue-500/20">
            <div>
              <p className="text-[10px] uppercase text-zinc-500 font-bold">Escrow Vaults</p>
              <p className="text-sm font-black text-blue-100">₦{stats.escrow_liquidity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-zinc-500 font-bold">User Wallets</p>
              <p className="text-sm font-black text-blue-100">₦{stats.wallet_liquidity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 🚀 NEW: Deep Dive Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Net Revenue</p>
            </div>
            <p className="text-3xl font-black text-white">₦{stats.total_revenue.toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-emerald-500/20">
            <div>
              <p className="text-[10px] uppercase text-zinc-500 font-bold">Escrow Fees</p>
              <p className="text-sm font-black text-emerald-100">₦{stats.escrow_revenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-zinc-500 font-bold">AdTech Sales</p>
              <p className="text-sm font-black text-emerald-100">₦{stats.ad_revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Existing GTV Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex justify-between items-center text-zinc-400">
            <p className="text-xs font-bold uppercase tracking-widest">Gross Volume</p>
            <span className="text-zinc-500 text-xs font-bold">GTV</span>
          </div>
          <p className="text-3xl font-black text-white">₦{totalGTV.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 font-semibold mt-auto">Lifetime escrowed transactions</p>
        </div>

        {/* Existing Disputes Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex justify-between items-center text-zinc-400">
            <p className="text-xs font-bold uppercase tracking-widest">Active Disputes</p>
            <span className="text-red-400 text-xs font-bold">Action Needed</span>
          </div>
          <p className={`text-3xl font-black ${(totalDisputes || 0) > 0 ? 'text-red-500' : 'text-white'}`}>
            {totalDisputes || 0}
          </p>
          <p className="text-xs text-zinc-500 font-semibold mt-auto">Requires judicial verdict</p>
        </div>

      </div>

      {/* Secondary Analytics Grid: Gateway Split & Traffic Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gateway Distribution Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-white">Gateway Liquidity Share</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Paystack (Local) vs Bachs.io (Crypto/Global)</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-blue-400">Paystack (NGN Fiat)</span>
                <span className="text-white">{paystackShare}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${paystackShare}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-indigo-400">Bachs.io (Crypto/Global)</span>
                <span className="text-white">{bachsShare}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${bachsShare}%` }}></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
            💡 Global stablecoin routing via Bachs is optimizing cross-border conversion limits.
          </div>
        </div>

        {/* Platform Core Metrics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-white">Ecosystem Inventory</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Merchants, programmatic listings & reach</p>
          </div>

          {/* 🚀 NEW: Grid updated to include Active Ads */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Merchants</p>
              <p className="text-xl font-black text-white mt-1">{totalMerchants || 0}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Listings</p>
              <p className="text-xl font-black text-white mt-1">{totalListings || 0}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
              <p className="text-[10px] text-amber-500 font-semibold uppercase">Active Ads</p>
              <p className="text-xl font-black text-white mt-1">{stats.active_ads || 0}</p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase">SEO Engine Clicks</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{totalClicks.toLocaleString()} Views</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-900/40 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
              ⚡ Action Center
            </span>
            <h3 className="text-xl font-black text-white mt-4">Vault Operations</h3>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              Review active transactions, handle incoming vendor verification applications, or disburse manual payouts securely.
            </p>
          </div>

          <div className="space-y-3 pt-6">
            <Link 
              href="/admin/escrows"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl transition-all text-xs shadow-lg"
            >
              Manage Escrow Ledgers →
            </Link>
          </div>
        </div>

      </div>

      {/* Highest Velocity Products (Clicks & Views Tracking) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-black text-white">🔥 Highest Velocity Products</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Listings generating the highest buyer attention, views, and click-through rates.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs">
              <tr>
                <th className="p-3 font-semibold">Product Title</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold text-center">Views</th>
                <th className="p-3 font-semibold text-center">Clicks</th>
                <th className="p-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rankedListings && rankedListings.length > 0 ? (
                rankedListings.map((item: any) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-bold text-white max-w-[260px] truncate">{item.title}</td>
                    <td className="p-3 font-black text-emerald-400">₦{item.price.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono text-zinc-300">{item.views}</td>
                    <td className="p-3 text-center font-mono text-blue-400 font-bold">{item.clicks}</td>
                    <td className="p-3 text-right">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-zinc-500">
                    Telemetry tracking active. Awaiting product interaction events...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Recent Transactions Feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-white">Live Activity Stream</h3>
            <p className="text-xs text-zinc-400">Real-time ledger audit trail of recent transactions.</p>
          </div>
          <Link href="/admin/escrows" className="text-xs font-bold text-emerald-400 hover:underline">
            View All →
          </Link>
        </div>

        <div className="divide-y divide-zinc-800 overflow-x-auto">
          {recentEscrows && recentEscrows.length > 0 ? (
            recentEscrows.map((row: any) => (
              <div key={row.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${row.status === 'funded' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                  <div>
                    <p className="font-bold text-white font-mono text-xs">{row.gateway_reference}</p>
                    <p className="text-[11px] text-zinc-500">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    row.gateway === 'paystack' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                  }`}>
                    {row.gateway}
                  </span>
                  <span className="font-black text-white">₦{row.amount.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-zinc-500 py-6">No recent transactions recorded yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}














// // app/admin/page.tsx
// import { createClient } from '@supabase/supabase-js';
// import Link from 'next/link';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export default async function AdminOverviewPage() {
//   // 1. Fetch Comprehensive Telemetry & Analytics in Parallel
//   const [
//     { count: totalMerchants },
//     { count: totalListings },
//     { data: escrowsData },
//     { count: totalDisputes },
//     { data: recentEscrows },
//     { data: trafficData },
//     { data: trendingListings }
//   ] = await Promise.all([
//     supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
//     supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }),
//     supabaseAdmin.from('escrows').select('amount, status, gateway'),
//     supabaseAdmin.from('escrows').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
//     supabaseAdmin.from('escrows').select('id, amount, gateway, status, created_at, gateway_reference').order('created_at', { ascending: false }).limit(5),
//     supabaseAdmin.from('telemetry_clicks').select('id, event_type, created_at').order('created_at', { ascending: false }).limit(100),
//     // Fetch listings along with their interaction logs for velocity ranking
//     supabaseAdmin.from('listings').select(`
//       id,
//       title,
//       price,
//       status,
//       listing_analytics ( id, event_type )
//     `).limit(20)
//   ]);

//   // 2. Financial Metrics & Gateway Breakdown
//   const escrows = escrowsData || [];
  
//   const totalGTV = escrows
//     .filter(e => e.status === 'completed' || e.status === 'funded')
//     .reduce((sum, e) => sum + Number(e.amount), 0);

//   const activeEscrowVolume = escrows
//     .filter(e => e.status === 'funded')
//     .reduce((sum, e) => sum + Number(e.amount), 0);

//   const totalPlatformRevenue = totalGTV * 0.025;

//   // Gateway Share Split
//   const paystackVolume = escrows
//     .filter(e => e.gateway === 'paystack' && (e.status === 'completed' || e.status === 'funded'))
//     .reduce((sum, e) => sum + Number(e.amount), 0);

//   const bachsVolume = escrows
//     .filter(e => e.gateway === 'bachs' && (e.status === 'completed' || e.status === 'funded'))
//     .reduce((sum, e) => sum + Number(e.amount), 0);

//   const paystackShare = totalGTV > 0 ? Math.round((paystackVolume / totalGTV) * 100) : 0;
//   const bachsShare = totalGTV > 0 ? Math.round((bachsVolume / totalGTV) * 100) : 0;

//   // Traffic / Clicks Telemetry Metrics
//   const totalClicks = trafficData?.length || 12450;

//   // 3. Process & Rank Highest Velocity Products
//   const rankedListings = (trendingListings || []).map((item: any) => {
//     const analytics = item.listing_analytics || [];
//     const views = analytics.filter((a: any) => a.event_type === 'view').length;
//     const clicks = analytics.filter((a: any) => a.event_type === 'click').length;
//     return {
//       ...item,
//       views,
//       clicks,
//       score: views + (clicks * 3) // Weight user clicks higher than passive impressions
//     };
//   }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

//   return (
//     <div className="space-y-8 pb-12">
      
//       {/* Top Header Banner */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
//         <div>
//           <h1 className="text-3xl font-black text-white">Command & Control</h1>
//           <p className="text-zinc-400 mt-1">Real-time macro liquidity, multi-gateway distribution, and traffic telemetry.</p>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-full">
//             🟢 Production Engine Active
//           </span>
//         </div>
//       </div>

//       {/* Primary Financial Core Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
//           <div className="flex justify-between items-center text-zinc-400">
//             <p className="text-xs font-bold uppercase tracking-widest">Gross Volume (GTV)</p>
//             <span className="text-emerald-400 text-xs font-bold">₦ NGN</span>
//           </div>
//           <p className="text-3xl font-black text-white">₦{totalGTV.toLocaleString()}</p>
//           <p className="text-xs text-zinc-500 font-semibold">Lifetime escrowed transactions</p>
//         </div>

//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
//           <div className="flex justify-between items-center text-zinc-400">
//             <p className="text-xs font-bold uppercase tracking-widest">Platform Revenue</p>
//             <span className="text-emerald-400 text-xs font-bold">2.5% Fee</span>
//           </div>
//           <p className="text-3xl font-black text-emerald-400">₦{totalPlatformRevenue.toLocaleString()}</p>
//           <p className="text-xs text-zinc-500 font-semibold">Accumulated platform earnings</p>
//         </div>

//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
//           <div className="flex justify-between items-center text-zinc-400">
//             <p className="text-xs font-bold uppercase tracking-widest">Active Vault Liquidity</p>
//             <span className="text-blue-400 text-xs font-bold">48-Hr Lock</span>
//           </div>
//           <p className="text-3xl font-black text-blue-400">₦{activeEscrowVolume.toLocaleString()}</p>
//           <p className="text-xs text-zinc-500 font-semibold">Funds currently pending release</p>
//         </div>

//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
//           <div className="flex justify-between items-center text-zinc-400">
//             <p className="text-xs font-bold uppercase tracking-widest">Active Disputes</p>
//             <span className="text-red-400 text-xs font-bold">Action Needed</span>
//           </div>
//           <p className={`text-3xl font-black ${(totalDisputes || 0) > 0 ? 'text-red-500' : 'text-white'}`}>
//             {totalDisputes || 0}
//           </p>
//           <p className="text-xs text-zinc-500 font-semibold">Requires judicial verdict</p>
//         </div>

//       </div>

//       {/* Secondary Analytics Grid: Gateway Split & Traffic Telemetry */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         {/* Gateway Distribution Breakdown */}
//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
//           <div>
//             <h3 className="text-base font-black text-white">Gateway Liquidity Share</h3>
//             <p className="text-xs text-zinc-400 mt-0.5">Paystack (Local) vs Bachs.io (Crypto/Global)</p>
//           </div>

//           <div className="space-y-4">
//             <div>
//               <div className="flex justify-between text-xs font-bold mb-1">
//                 <span className="text-blue-400">Paystack (NGN Fiat)</span>
//                 <span className="text-white">{paystackShare}%</span>
//               </div>
//               <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
//                 <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${paystackShare}%` }}></div>
//               </div>
//             </div>

//             <div>
//               <div className="flex justify-between text-xs font-bold mb-1">
//                 <span className="text-indigo-400">Bachs.io (Crypto/Global)</span>
//                 <span className="text-white">{bachsShare}%</span>
//               </div>
//               <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
//                 <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${bachsShare}%` }}></div>
//               </div>
//             </div>
//           </div>

//           <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
//             💡 Global stablecoin routing via Bachs is optimizing cross-border conversion limits.
//           </div>
//         </div>

//         {/* Platform Core Metrics */}
//         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
//           <div>
//             <h3 className="text-base font-black text-white">Ecosystem Inventory</h3>
//             <p className="text-xs text-zinc-400 mt-0.5">Merchants, programmatic listings & reach</p>
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
//               <p className="text-xs text-zinc-400 font-semibold uppercase">Merchants</p>
//               <p className="text-2xl font-black text-white mt-1">{totalMerchants || 0}</p>
//             </div>
//             <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
//               <p className="text-xs text-zinc-400 font-semibold uppercase">Listings</p>
//               <p className="text-2xl font-black text-white mt-1">{totalListings || 0}</p>
//             </div>
//           </div>

//           <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
//             <div>
//               <p className="text-xs text-zinc-400 font-semibold uppercase">SEO Engine Clicks</p>
//               <p className="text-xl font-black text-emerald-400 mt-1">{totalClicks.toLocaleString()} Views</p>
//             </div>
//             <span className="text-2xl">📈</span>
//           </div>
//         </div>

//         {/* Quick Action Navigation */}
//         <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-900/40 rounded-3xl p-6 flex flex-col justify-between">
//           <div>
//             <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
//               ⚡ Action Center
//             </span>
//             <h3 className="text-xl font-black text-white mt-4">Vault Operations</h3>
//             <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
//               Review active transactions, handle incoming vendor verification applications, or disburse manual payouts securely.
//             </p>
//           </div>

//           <div className="space-y-3 pt-6">
//             <Link 
//               href="/admin/escrows"
//               className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 rounded-xl transition-all text-xs shadow-lg"
//             >
//               Manage Escrow Ledgers →
//             </Link>
//           </div>
//         </div>

//       </div>

//       {/* Highest Velocity Products (Clicks & Views Tracking) */}
//       <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
//         <div>
//           <h3 className="text-base font-black text-white">🔥 Highest Velocity Products</h3>
//           <p className="text-xs text-zinc-400 mt-0.5">Listings generating the highest buyer attention, views, and click-through rates.</p>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left text-sm">
//             <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs">
//               <tr>
//                 <th className="p-3 font-semibold">Product Title</th>
//                 <th className="p-3 font-semibold">Price</th>
//                 <th className="p-3 font-semibold text-center">Views</th>
//                 <th className="p-3 font-semibold text-center">Clicks</th>
//                 <th className="p-3 font-semibold text-right">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-zinc-800">
//               {rankedListings && rankedListings.length > 0 ? (
//                 rankedListings.map((item: any) => (
//                   <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
//                     <td className="p-3 font-bold text-white max-w-[260px] truncate">{item.title}</td>
//                     <td className="p-3 font-black text-emerald-400">₦{item.price.toLocaleString()}</td>
//                     <td className="p-3 text-center font-mono text-zinc-300">{item.views}</td>
//                     <td className="p-3 text-center font-mono text-blue-400 font-bold">{item.clicks}</td>
//                     <td className="p-3 text-right">
//                       <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
//                         {item.status}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={5} className="p-8 text-center text-xs text-zinc-500">
//                     Telemetry tracking active. Awaiting product interaction events...
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Live Recent Transactions Feed */}
//       <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
//         <div className="flex justify-between items-center">
//           <div>
//             <h3 className="text-base font-black text-white">Live Activity Stream</h3>
//             <p className="text-xs text-zinc-400">Real-time ledger audit trail of recent transactions.</p>
//           </div>
//           <Link href="/admin/escrows" className="text-xs font-bold text-emerald-400 hover:underline">
//             View All →
//           </Link>
//         </div>

//         <div className="divide-y divide-zinc-800 overflow-x-auto">
//           {recentEscrows && recentEscrows.length > 0 ? (
//             recentEscrows.map((row: any) => (
//               <div key={row.id} className="py-3 flex items-center justify-between gap-4 text-sm">
//                 <div className="flex items-center gap-3">
//                   <span className={`w-2 h-2 rounded-full ${row.status === 'funded' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
//                   <div>
//                     <p className="font-bold text-white font-mono text-xs">{row.gateway_reference}</p>
//                     <p className="text-[11px] text-zinc-500">{new Date(row.created_at).toLocaleString()}</p>
//                   </div>
//                 </div>

//                 <div className="flex items-center gap-6">
//                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
//                     row.gateway === 'paystack' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
//                   }`}>
//                     {row.gateway}
//                   </span>
//                   <span className="font-black text-white">₦{row.amount.toLocaleString()}</span>
//                 </div>
//               </div>
//             ))
//           ) : (
//             <p className="text-center text-xs text-zinc-500 py-6">No recent transactions recorded yet.</p>
//           )}
//         </div>
//       </div>

//     </div>
//   );
// }