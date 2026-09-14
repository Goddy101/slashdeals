'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function DigitalAssetsMarketplace() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [assetType, setAssetType] = useState<'startups' | 'social'>('startups');

  useEffect(() => {
    fetchAssets();
  }, [assetType]);

  async function fetchAssets() {
    setLoading(true);
    let query = supabase
      .from('deals')
      .select('*, profiles(business_name, is_verified, successful_sales)')
      .eq('status', 'active');

    if (assetType === 'startups') {
      query = query.in('asset_type', ['saas', 'content_site', 'ecommerce', 'domain_name', 'mobile_app']);
    } else {
      query = query.in('asset_type', ['social_account']);
    }

    // Default to newest if we moved from flat columns to JSONB
    query = query.order('created_at', { ascending: false });

    const { data } = await query.limit(20);
    if (data) setAssets(data);
    setLoading(false);
  }

  // 💻 Premium SaaS / Startup Card
  const StartupCard = ({ asset }: { asset: any }) => {
    const metrics = asset.asset_metrics || {};
    const mrr = metrics.mrr || asset.monthly_revenue || 0;
    const annualRevenue = mrr * 12;
    const multiple = annualRevenue > 0 ? (asset.deal_price / annualRevenue).toFixed(1) : 'N/A';
    
    // Earned Trust
    const successfulSales = asset.profiles?.successful_sales || 0;
    const isPro = successfulSales >= 3;

    return (
      <Link href={`/deal/${asset.id}`} className="group relative block bg-white rounded-[24px] border border-gray-200 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {asset.is_verified_owner && (
          <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm z-10 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Verified Owner
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start mb-6 pr-24">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-xl">💻</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1 block">
                  {asset.asset_type.replace('_', ' ')}
                </span>
                <h3 className="text-lg font-black text-gray-900 leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {asset.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Bento Box Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Asking Price
              </p>
              <p className="text-xl font-black text-gray-900 tracking-tight">₦{asset.deal_price.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
              <p className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Monthly Rev (MRR)</p>
              <p className="text-xl font-black text-emerald-600 tracking-tight">
                {mrr > 0 ? `₦${mrr.toLocaleString()}` : 'Pre-Rev'}
              </p>
            </div>
          </div>

          {/* Dynamic Tags */}
          <div className="flex flex-wrap gap-2">
            {metrics.users > 0 && (
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-gray-400">👥</span> {metrics.users.toLocaleString()} Users
              </span>
            )}
            {multiple !== 'N/A' && (
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-gray-400">📈</span> {multiple}x ARR
              </span>
            )}
            {metrics.tech_stack && (
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-lg truncate max-w-[140px]">
                ⚙️ {metrics.tech_stack}
              </span>
            )}
            {isPro && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                ⭐ Pro Seller
              </span>
            )}
          </div>
        </div>
        
        {/* Escrow Trust Footer */}
        <div className="bg-zinc-950 px-6 py-4 flex justify-between items-center group-hover:bg-black transition-colors">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">5-Day Escrow Handover</span>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-blue-400 flex items-center gap-1 transition-colors">
            Inspect <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </span>
        </div>
      </Link>
    );
  };

  // 📱 Premium Social Media Card
  const SocialCard = ({ asset }: { asset: any }) => {
    const metrics = asset.asset_metrics || {};
    const followers = metrics.followers || asset.follower_count || 0;
    const engagement = metrics.engagement_rate || 0;
    
    // Earned Trust
    const successfulSales = asset.profiles?.successful_sales || 0;
    const isPro = successfulSales >= 3;

    return (
      <Link href={`/deal/${asset.id}`} className="group relative block bg-white rounded-[24px] border border-gray-200 shadow-sm hover:shadow-2xl hover:border-pink-200 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {asset.is_verified_owner && (
          <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm z-10 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Verified Owner
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start mb-6 pr-24">
             <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 mb-1 block">
                  {metrics.platform || asset.platform || 'Social'} Asset
                </span>
                <h3 className="text-lg font-black text-gray-900 leading-tight line-clamp-1 group-hover:text-pink-600 transition-colors">
                  {asset.title}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Asking Price
              </p>
              <p className="text-xl font-black text-gray-900 tracking-tight">₦{asset.deal_price.toLocaleString()}</p>
            </div>
            <div className="bg-fuchsia-50/50 rounded-2xl p-4 border border-fuchsia-100">
              <p className="text-[11px] font-bold text-fuchsia-600/70 uppercase tracking-wider mb-1">Followers</p>
              <p className="text-xl font-black text-fuchsia-700 tracking-tight">
                {followers.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {engagement > 0 && (
              <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                🔥 {engagement}% Engagement
              </span>
            )}
            {metrics.includes_og_email && (
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100/80 px-3 py-1.5 rounded-lg">
                ✨ Original Email Included
              </span>
            )}
            {isPro && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                ⭐ Pro Seller
              </span>
            )}
          </div>
        </div>
        
        {/* Escrow Trust Footer */}
        <div className="bg-zinc-950 px-6 py-4 flex justify-between items-center group-hover:bg-black transition-colors">
           <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Secure Transfer</span>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-pink-400 flex items-center gap-1 transition-colors">
            View Page <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* 🚀 Premium Fintech Hero Section */}
      <div className="relative bg-[#090E17] pt-24 pb-28 px-4 overflow-hidden border-b border-white/10">
        {/* Deep background glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Premium Liquidity Hub</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-6">
            Acquire Digital Assets.
          </h1>
          <p className="text-lg text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            The exclusive marketplace for verified SaaS startups, premium domains, and monetized social accounts. <strong className="text-white">100% secured by SlashDeals Escrow.</strong>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* 🎛 iOS Style Segmented Control */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-gray-200/50 flex gap-1">
            <button 
              onClick={() => setAssetType('startups')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                assetType === 'startups' 
                ? 'bg-zinc-900 text-white shadow-md transform scale-100' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 scale-95'
              }`}
            >
              💻 Tech Startups
            </button>
            <button 
              onClick={() => setAssetType('social')}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                assetType === 'social' 
                ? 'bg-zinc-900 text-white shadow-md transform scale-100' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 scale-95'
              }`}
            >
              📱 Social Pages
            </button>
          </div>
        </div>

        {/* Asset Feed */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="font-bold text-gray-400 animate-pulse">Loading premium pipeline...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              {assets.map(asset => (
                assetType === 'startups' 
                  ? <StartupCard key={asset.id} asset={asset} />
                  : <SocialCard key={asset.id} asset={asset} />
              ))}
            </div>

            {/* Premium Empty State */}
            {assets.length === 0 && (
              <div className="text-center py-28 bg-white/50 backdrop-blur-sm rounded-[32px] border border-dashed border-gray-300 shadow-sm mt-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">The market is waiting.</h3>
                  <p className="text-gray-500 font-medium max-w-md mx-auto mb-8 leading-relaxed">
                    Zero {assetType === 'startups' ? 'tech startups' : 'social accounts'} currently listed. Bypass the brokers and list your asset directly to thousands of verified buyers.
                  </p>
                  <Link href="/merchant/post?type=digital" className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                    List Your Asset Now <span className="text-blue-400">&rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}