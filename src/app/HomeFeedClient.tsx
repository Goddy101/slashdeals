// app/HomeFeedClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

const DEALS_PER_PAGE = 20;
const CATEGORIES = ['All', 'Tech', 'Fashion', 'Startups', 'Food', 'General'];

// 🚀 UPGRADED: Premium Deal Card Component
const DealCard = ({ deal, isSpotlight }: { deal: any, isSpotlight?: boolean }) => {
  const discount = deal.original_price > deal.deal_price 
    ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100) 
    : 0;
    
  const isFlashBumped = deal.bumped_at && new Date(deal.bumped_at).getTime() > Date.now() - 60 * 60 * 1000;
  const primaryImage = deal.image_url || (deal.images && deal.images[0]) || null;
  const successfulSales = deal.profiles?.successful_sales || 0;
  const isProMerchant = successfulSales >= 3;

  const handleCardClick = () => {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: deal.id, eventType: 'click' }),
    }).catch(() => {});
  };

  return (
    <div className={`group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border flex flex-col h-full hover:-translate-y-1 ${
      isSpotlight ? 'border-amber-300 hover:border-amber-400 bg-gradient-to-b from-amber-50/50 to-white' : 
      isFlashBumped ? 'border-emerald-200 hover:border-emerald-400' : 'border-gray-200 hover:border-black/20'
    }`}>
      
      {/* Dynamic Top Gradients based on status */}
      {isSpotlight && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 z-10" />}
      {!isSpotlight && isFlashBumped && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 z-10" />}

      <Link href={`/deal/${deal.id}`} onClick={handleCardClick} className="block flex-grow relative overflow-hidden">
        <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          
          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {isSpotlight && (
              <div className="bg-white/95 backdrop-blur-sm text-amber-600 text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider border border-amber-100">
                ⭐ Spotlight
              </div>
            )}
            {!isSpotlight && isFlashBumped && (
              <div className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                ⚡ Flash Bump
              </div>
            )}
            {deal.is_escrow_enabled && (
              <div className="bg-zinc-900 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-sm uppercase tracking-widest flex items-center gap-1 w-fit">
                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                Protected
              </div>
            )}
          </div>
          
          {primaryImage ? (
            <img 
              src={primaryImage} 
              alt={deal.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              loading="lazy" 
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug text-sm group-hover:text-blue-600 transition-colors">
            {deal.title}
          </h3>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-gray-900 tracking-tight">₦{deal.deal_price.toLocaleString()}</span>
              {discount > 0 && (
                <span className="text-xs font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">-{discount}%</span>
              )}
            </div>
            {discount > 0 && (
              <span className="text-xs text-gray-400 font-medium line-through">Was ₦{deal.original_price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5 mt-auto bg-white">
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          
          {/* Enhanced Trust Engine Output */}
          <div className="text-xs font-medium text-gray-500 truncate pr-2 flex flex-col justify-center">
            <span className="truncate text-gray-700 font-bold">{deal.profiles?.business_name || 'Verified Vendor'}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {isProMerchant ? (
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Pro ({successfulSales})
                </span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  Level 1
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
              🔥 {deal.upvotes_count || 0}
            </span>
            <a 
              href={`https://wa.me/?text=Check out this massive deal on SlashDeals: ₦${deal.deal_price.toLocaleString()} - ${process.env.NEXT_SITE_URL}/deal/${deal.id}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} 
              className="w-8 h-8 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all transform hover:scale-110"
              title="Share to WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.397 0 .015 5.38.015 12.012c0 2.122.553 4.19 1.603 6.014L.197 24l6.126-1.605a11.96 11.96 0 005.708 1.442h.004c6.632 0 12.013-5.38 12.013-12.012C24.048 5.38 18.666 0 12.031 0z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Client Component
type HomeFeedProps = {
  initialTakeover: any;
  initialSpotlights: any[];
  initialDeals: any[];
  initialCategory: string;
  initialSort: 'trending' | 'newest';
};

export default function HomeFeedClient({ 
  initialTakeover, 
  initialSpotlights, 
  initialDeals, 
  initialCategory, 
  initialSort 
}: HomeFeedProps) {
  
  const router = useRouter();
  const supabase = createClient();
  
  const [takeover] = useState<any>(initialTakeover);
  const [spotlightDeals, setSpotlightDeals] = useState<any[]>(initialSpotlights);
  const [feedDeals, setFeedDeals] = useState<any[]>(initialDeals);
  
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'trending' | 'newest'>(initialSort);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialDeals.length === DEALS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setFeedDeals(initialDeals);
    setSpotlightDeals(initialSpotlights);
    setHasMore(initialDeals.length === DEALS_PER_PAGE);
    setPage(1);
    setActiveCategory(initialCategory);
    setSortBy(initialSort);
  }, [initialDeals, initialSpotlights, initialCategory, initialSort]);

  const handleFilterChange = (newCategory: string, newSort: string) => {
    setActiveCategory(newCategory);
    setSortBy(newSort as 'trending' | 'newest');
    router.push(`/?category=${newCategory}&sort=${newSort}`);
  };

  async function loadMoreDeals() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const from = (nextPage - 1) * DEALS_PER_PAGE;
    const to = from + DEALS_PER_PAGE - 1;

    let feedQuery = supabase
      .from('deals')
      .select('*, profiles(business_name, successful_sales)')
      .eq('status', 'active')
      .range(from, to);

    if (activeCategory !== 'All') {
      feedQuery = feedQuery.eq('category', activeCategory.toLowerCase());
    }

    if (sortBy === 'trending') {
      feedQuery = feedQuery
        .order('bumped_at', { ascending: false, nullsFirst: false })
        .order('upvotes_count', { ascending: false });
    } else {
      feedQuery = feedQuery.order('created_at', { ascending: false });
    }
    
    const { data: organic } = await feedQuery;

    if (organic) {
      setFeedDeals(prev => [...prev, ...organic]);
      setHasMore(organic.length === DEALS_PER_PAGE);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');

    let submitUrl = urlInput.trim();
    if (!submitUrl) return;
    if (!submitUrl.startsWith('http')) submitUrl = 'https://' + submitUrl;

    try {
      const parsedUrl = new URL(submitUrl);
      const host = parsedUrl.hostname.toLowerCase();
      const blockedDomains = ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'rebrand.ly'];
      
      if (blockedDomains.some(domain => host.includes(domain))) {
        return setUrlError('URL shorteners are not allowed for security reasons.');
      }
      if (host.includes('chat.whatsapp.com')) {
        return setUrlError('WhatsApp Group links are banned. Use direct wa.me links.');
      }
      router.push(`/merchant/post?url=${encodeURIComponent(submitUrl)}`);
    } catch (err) {
      setUrlError('Please enter a valid website link.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">

      {/* 1. Platform Takeover Banner */}
      {/* {takeover && (
        <div 
          className="w-full p-4 text-center cursor-pointer transition-opacity hover:opacity-95"
          style={{ backgroundColor: takeover.brand_hex_color || '#000', color: '#fff' }}
          onClick={() => router.push(`/takeover/${takeover.id}`)}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg hidden sm:inline-block tracking-widest uppercase">Sponsored</span>
            <h2 className="text-sm md:text-base font-black truncate px-4">{takeover.brand_headline}</h2>
            <span className="text-sm font-bold bg-white text-black px-4 py-1.5 rounded-lg hover:scale-105 transition-transform shrink-0">Shop Now</span>
          </div>
        </div>
      )}
      
      
      */}

      {/* 1. THE BILLBOARD (Platform Takeover or In-House Ad) */}
      {takeover ? (
        // STATE A: PAID BRAND TAKEOVER
        <div 
          className="relative w-full h-20 sm:h-24 lg:h-28 cursor-pointer overflow-hidden group"
          style={{ backgroundColor: takeover.brand_hex_color || '#090E17' }}
          onClick={() => router.push(`/takeover/${takeover.id}`)}
        >
          {/* Background Image with Overlay */}
          {takeover.banner_image_url && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700 ease-out"
              style={{ backgroundImage: `url(${takeover.banner_image_url})` }}
            />
          )}
          {/* Subtle gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/20" />
          
          <div className="relative h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1.5 rounded-lg hidden md:flex items-center gap-1.5 uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                Sponsored Takeover
              </span>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white truncate max-w-2xl drop-shadow-lg tracking-tight">
                {takeover.brand_headline}
              </h2>
            </div>
            <span className="text-sm font-black bg-white text-black px-6 py-3 rounded-xl hover:scale-105 transition-transform shrink-0 shadow-xl shadow-black/20">
              Shop Now &rarr;
            </span>
          </div>
        </div>
      ) : (
        // STATE B: IN-HOUSE FALLBACK AD (Promoting your highest margin segment)
        <div 
          className="relative w-full h-20 sm:h-24 lg:h-28 cursor-pointer overflow-hidden group bg-[#090E17]"
          onClick={() => router.push('/startups')}
        >
          {/* Abstract Cyber/Tech Background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 group-hover:bg-blue-500/30 transition-colors duration-700 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          
          <div className="relative h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg hidden md:inline-block uppercase tracking-widest border border-blue-500/30">
                SlashDeals Premium
              </span>
              <div>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white truncate drop-shadow-lg tracking-tight">
                  Acquire Tech Startups & Social Assets.
                </h2>
                <p className="text-xs font-bold text-gray-400 hidden sm:block mt-1">
                  100% Secured by the SlashDeals 5-Day Escrow Handover Protocol.
                </p>
              </div>
            </div>
            <span className="text-sm font-black bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-500 hover:scale-105 transition-all shrink-0 shadow-lg shadow-blue-900/50">
              Explore Vault 💻
            </span>
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <div className="bg-white border-b border-gray-200 pt-10 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
            Never Pay Full Price.
          </h1>
          <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto">
            Found a crazy price slash on Jumia, Konga, or IG? Drop the link below to share it, or list your own product securely.
          </p>

          <form onSubmit={handleUrlSubmit} className="relative max-w-2xl mx-auto mt-8">
            <input 
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste URL (e.g. jumia.com.ng/item or wa.me/234...)"
              className="w-full py-5 pl-6 pr-36 bg-gray-50 border border-gray-200 rounded-[20px] focus:ring-4 focus:ring-gray-100 focus:border-gray-900 outline-none transition-all font-medium text-gray-900 text-lg shadow-inner"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-black text-white font-black px-8 rounded-2xl hover:bg-gray-800 transition-colors hover:shadow-lg"
            >
              Post Deal
            </button>
          </form>
          {urlError && <p className="text-red-500 text-sm font-bold animate-pulse">{urlError}</p>}

          <div className="pt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
            <span>Are you a registered merchant?</span>
            <Link href="/login" className="text-blue-600 font-black hover:underline flex items-center gap-1 transition-colors">
              Access Dashboard <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-16">

        {/* 3. Upgraded Category Scroller */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => handleFilterChange(cat, sortBy)}
              className={`whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-black transition-all duration-300 transform hover:scale-105 ${
                activeCategory === cat 
                  ? 'bg-black text-white shadow-lg shadow-black/20' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-black shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4. The Spotlight Arena */}
        {spotlightDeals.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Spotlight</h2>
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-lg border border-amber-200 uppercase tracking-wider">
                ⭐ 24-Hour Top Picks
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {spotlightDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} isSpotlight={true} />
              ))}
            </div>
          </section>
        )}

        {/* 5. The Organic Feed */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {activeCategory === 'All' ? 'Live Feed' : `${activeCategory} Deals`}
              </h2>
              <p className="text-sm font-bold text-gray-500 mt-2">Real-time active listings and flash bumps</p>
            </div>
            
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => handleFilterChange(activeCategory, e.target.value)}
                className="appearance-none bg-white border border-gray-200 px-5 py-3 pr-10 rounded-xl text-sm font-black text-gray-700 outline-none cursor-pointer hover:border-black focus:ring-4 focus:ring-gray-100 transition-all shadow-sm"
              >
                <option value="trending">🔥 Trending (Bumps)</option>
                <option value="newest">✨ Newest Arrivals</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {feedDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} isSpotlight={false} />
            ))}
          </div>

          {/* 6. Pagination Footer */}
          <div className="mt-16 flex justify-center pb-12">
            {loadingMore ? (
              <div className="px-8 py-4 font-black text-gray-500 bg-gray-100 rounded-2xl flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Loading more deals...
              </div>
            ) : hasMore ? (
              <button 
                onClick={loadMoreDeals}
                className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black hover:bg-black hover:text-white font-black px-10 py-4 rounded-2xl transition-all shadow-sm hover:shadow-xl transform hover:-translate-y-1 text-lg"
              >
                Load More Deals
              </button>
            ) : feedDeals.length > 0 ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🏁</div>
                <p className="text-gray-500 font-bold text-lg">You've reached the end of the feed!</p>
              </div>
            ) : (
              <div className="text-center py-24 w-full bg-white rounded-3xl border border-dashed border-gray-300 col-span-full">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">No deals found</h3>
                <p className="text-gray-500 font-medium">There are currently no active deals in this category.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}















// // app/HomeFeedClient.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// import Link from 'next/link';

// const DEALS_PER_PAGE = 20;
// const CATEGORIES = ['All', 'Tech', 'Fashion', 'Startups', 'Food', 'General'];

// // Extracted Component for maximum rendering performance
// const DealCard = ({ deal, isSpotlight }: { deal: any, isSpotlight?: boolean }) => {
//   const discount = deal.original_price > deal.deal_price 
//     ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100) 
//     : 0;
    
//   const isFlashBumped = deal.bumped_at && new Date(deal.bumped_at).getTime() > Date.now() - 60 * 60 * 1000;

//   const handleCardClick = () => {
//     fetch('/api/telemetry', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ listingId: deal.id, eventType: 'click' }),
//     }).catch(() => {});
//   };

//   return (
//     <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border ${
//       isSpotlight ? 'border-amber-400 ring-2 ring-amber-400/20' : 
//       isFlashBumped ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-gray-200'
//     }`}>
//       <Link href={`/deal/${deal.id}`} onClick={handleCardClick} className="block">
//         <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
//           {isSpotlight && (
//             <div className="absolute top-3 left-3 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
//               <span>⭐</span> SPOTLIGHT
//             </div>
//           )}
//           {!isSpotlight && isFlashBumped && (
//             <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
//               <span>⚡</span> FLASH BUMP
//             </div>
//           )}
          
//           {deal.is_escrow_enabled && (
//             <div className="absolute top-3 right-3 bg-black text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10">
//               🛡️ ESCROW
//             </div>
//           )}
          
//           {deal.image_url ? (
//             <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" loading="lazy" />
//           ) : (
//             <span className="text-gray-300 font-bold">No Image</span>
//           )}
//         </div>

//         <div className="p-4 space-y-3">
//           <div className="flex justify-between items-start gap-2">
//             <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-sm hover:underline">{deal.title}</h3>
//           </div>

//           <div className="flex items-end gap-2">
//             <span className="text-xl font-black text-gray-900">₦{deal.deal_price.toLocaleString()}</span>
//             {discount > 0 && (
//               <>
//                 <span className="text-sm text-gray-400 line-through mb-0.5">₦{deal.original_price.toLocaleString()}</span>
//                 <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md mb-1">-{discount}%</span>
//               </>
//             )}
//           </div>
//         </div>
//       </Link>

//       <div className="px-4 pb-4">
//         <div className="flex items-center justify-between pt-3 border-t border-gray-100">
//           <div className="text-xs font-medium text-gray-500 truncate pr-2 flex items-center gap-1">
//             By {deal.profiles?.business_name || 'Verified Vendor'}
//             {deal.profiles?.is_verified && <span className="text-blue-500" title="Verified Vendor">✓</span>}
//           </div>

//           <div className="flex items-center gap-2 shrink-0">
//             <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
//               👍 {deal.upvotes_count || 0}
//             </span>
//             <a 
//               href={`https://wa.me/?text=Check out this massive deal on SlashDeals: ₦${deal.deal_price.toLocaleString()} - ${process.env.NEXT_SITE_URL}/deal/${deal.id}`}
//               target="_blank" rel="noopener noreferrer"
//               onClick={(e) => e.stopPropagation()} // Prevents navigating to deal page
//               className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
//               title="Share to WhatsApp"
//             >
//               <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.397 0 .015 5.38.015 12.012c0 2.122.553 4.19 1.603 6.014L.197 24l6.126-1.605a11.96 11.96 0 005.708 1.442h.004c6.632 0 12.013-5.38 12.013-12.012C24.048 5.38 18.666 0 12.031 0z"/></svg>
//             </a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Main Client Component
// type HomeFeedProps = {
//   initialTakeover: any;
//   initialSpotlights: any[];
//   initialDeals: any[];
//   initialCategory: string;
//   initialSort: 'trending' | 'newest';
// };

// export default function HomeFeedClient({ 
//   initialTakeover, 
//   initialSpotlights, 
//   initialDeals, 
//   initialCategory, 
//   initialSort 
// }: HomeFeedProps) {
  
//   const router = useRouter();
//   const supabase = createClient();
  
//   // Data States seeded from Server
//   const [takeover] = useState<any>(initialTakeover);
//   const [spotlightDeals, setSpotlightDeals] = useState<any[]>(initialSpotlights);
//   const [feedDeals, setFeedDeals] = useState<any[]>(initialDeals);
  
//   // UI States
//   const [activeCategory, setActiveCategory] = useState(initialCategory);
//   const [sortBy, setSortBy] = useState<'trending' | 'newest'>(initialSort);
//   const [urlInput, setUrlInput] = useState('');
//   const [urlError, setUrlError] = useState('');

//   // Pagination States
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(initialDeals.length === DEALS_PER_PAGE);
//   const [loadingMore, setLoadingMore] = useState(false);

//   // Sync state when URL params change (Server passes new props)
//   useEffect(() => {
//     setFeedDeals(initialDeals);
//     setSpotlightDeals(initialSpotlights);
//     setHasMore(initialDeals.length === DEALS_PER_PAGE);
//     setPage(1);
//     setActiveCategory(initialCategory);
//     setSortBy(initialSort);
//   }, [initialDeals, initialSpotlights, initialCategory, initialSort]);

//   // Route updates back to Server for new data
//   const handleFilterChange = (newCategory: string, newSort: string) => {
//     setActiveCategory(newCategory);
//     setSortBy(newSort as 'trending' | 'newest');
//     router.push(`/?category=${newCategory}&sort=${newSort}`);
//   };

//   // Client-side pagination logic
//   async function loadMoreDeals() {
//     setLoadingMore(true);
//     const nextPage = page + 1;
//     const from = (nextPage - 1) * DEALS_PER_PAGE;
//     const to = from + DEALS_PER_PAGE - 1;

//     let feedQuery = supabase
//       .from('deals')
//       .select('*, profiles(business_name, is_verified)')
//       .eq('status', 'active')
//       .range(from, to);

//     if (activeCategory !== 'All') {
//       feedQuery = feedQuery.eq('category', activeCategory.toLowerCase());
//     }

//     if (sortBy === 'trending') {
//       feedQuery = feedQuery
//         .order('bumped_at', { ascending: false, nullsFirst: false })
//         .order('upvotes_count', { ascending: false });
//     } else {
//       feedQuery = feedQuery.order('created_at', { ascending: false });
//     }
    
//     const { data: organic } = await feedQuery;

//     if (organic) {
//       setFeedDeals(prev => [...prev, ...organic]);
//       setHasMore(organic.length === DEALS_PER_PAGE);
//       setPage(nextPage);
//     }
//     setLoadingMore(false);
//   }

//   const handleUrlSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setUrlError('');

//     let submitUrl = urlInput.trim();
//     if (!submitUrl) return;
//     if (!submitUrl.startsWith('http')) submitUrl = 'https://' + submitUrl;

//     try {
//       const parsedUrl = new URL(submitUrl);
//       const host = parsedUrl.hostname.toLowerCase();
//       const blockedDomains = ['bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'rebrand.ly'];
      
//       if (blockedDomains.some(domain => host.includes(domain))) {
//         return setUrlError('URL shorteners are not allowed for security reasons.');
//       }
//       if (host.includes('chat.whatsapp.com')) {
//         return setUrlError('WhatsApp Group links are banned. Use direct wa.me links.');
//       }
//       router.push(`/merchant/post?url=${encodeURIComponent(submitUrl)}`);
//     } catch (err) {
//       setUrlError('Please enter a valid website link.');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20">

//       {/* 1. Platform Takeover Banner */}
//       {takeover && (
//         <div 
//           className="w-full p-4 text-center cursor-pointer"
//           style={{ backgroundColor: takeover.brand_hex_color || '#000', color: '#fff' }}
//           onClick={() => router.push(`/takeover/${takeover.id}`)}
//         >
//           <div className="max-w-5xl mx-auto flex items-center justify-between">
//             <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded hidden sm:inline-block">SPONSORED BRAND TAKEOVER</span>
//             <h2 className="text-sm md:text-base font-black truncate px-4">{takeover.brand_headline}</h2>
//             <span className="text-sm font-bold border border-white/50 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors shrink-0">Shop Now &rarr;</span>
//           </div>
//         </div>
//       )}

//       {/* 2. Hero Section */}
//       <div className="bg-white border-b border-gray-200 pt-8 pb-10 px-4">
//         <div className="max-w-2xl mx-auto text-center space-y-6">
//           <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
//             Never Pay Full Price.
//           </h1>
//           <p className="text-gray-500 font-medium">
//             Found a crazy price slash on Jumia, Konga, or IG? Drop the link below to share it (or list your own product).
//           </p>

//           <form onSubmit={handleUrlSubmit} className="relative max-w-xl mx-auto">
//             <input 
//               type="text"
//               value={urlInput}
//               onChange={(e) => setUrlInput(e.target.value)}
//               placeholder="Paste URL (e.g. jumia.com.ng/item or wa.me/234...)"
//               className="w-full py-4 pl-4 pr-32 bg-gray-100 border-2 border-transparent rounded-2xl focus:border-black focus:bg-white outline-none transition-all font-medium text-gray-900"
//             />
//             <button 
//               type="submit"
//               className="absolute right-2 top-2 bottom-2 bg-black text-white font-bold px-6 rounded-xl hover:bg-gray-800 transition-colors"
//             >
//               Post Deal
//             </button>
//           </form>
//           {urlError && <p className="text-red-500 text-sm font-bold animate-pulse">{urlError}</p>}

//           <div className="pt-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
//             <span>Are you a registered merchant?</span>
//             <Link href="/login" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
//               Access your Dashboard <span aria-hidden="true">&rarr;</span>
//             </Link>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

//         {/* 3. Category Scroller */}
//         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
//           {CATEGORIES.map(cat => (
//             <button 
//               key={cat}
//               onClick={() => handleFilterChange(cat, sortBy)}
//               className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
//                 activeCategory === cat 
//                   ? 'bg-black text-white' 
//                   : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-900'
//               }`}
//             >
//               {cat}
//             </button>
//           ))}
//         </div>

//         {/* 4. The Spotlight Arena */}
//         {spotlightDeals.length > 0 && (
//           <section>
//             <div className="flex items-center gap-3 mb-6">
//               <h2 className="text-2xl font-black text-gray-900">Featured Spotlight</h2>
//               <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md border border-amber-200">
//                 ⭐ 24-Hour Top Picks
//               </span>
//             </div>
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
//               {spotlightDeals.map(deal => (
//                 <DealCard key={deal.id} deal={deal} isSpotlight={true} />
//               ))}
//             </div>
//           </section>
//         )}

//         {/* 5. The Organic Feed */}
//         <section>
//           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
//             <div className="flex flex-col">
//               <h2 className="text-2xl font-black text-gray-900">
//                 {activeCategory === 'All' ? 'Live Feed' : `${activeCategory} Deals`}
//               </h2>
//               <p className="text-xs font-medium text-gray-500 mt-1">Real-time active listings and flash bumps</p>
//             </div>
            
//             <select 
//               value={sortBy}
//               onChange={(e) => handleFilterChange(activeCategory, e.target.value)}
//               className="bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 outline-none cursor-pointer hover:border-gray-300 focus:ring-2 focus:ring-black transition-all"
//             >
//               <option value="trending">Sort by: Trending (Bumps)</option>
//               <option value="newest">Sort by: Newest Arrivals</option>
//             </select>
//           </div>

//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//             {feedDeals.map(deal => (
//               <DealCard key={deal.id} deal={deal} isSpotlight={false} />
//             ))}
//           </div>

//           {/* 6. Pagination Footer */}
//           <div className="mt-12 flex justify-center pb-8">
//             {loadingMore ? (
//               <div className="px-6 py-3 font-bold text-gray-500 bg-gray-100 rounded-full flex items-center gap-2">
//                 <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
//                 Loading more...
//               </div>
//             ) : hasMore ? (
//               <button 
//                 onClick={loadMoreDeals}
//                 className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black hover:text-black font-bold px-8 py-3 rounded-full transition-colors shadow-sm"
//               >
//                 Load More Deals
//               </button>
//             ) : feedDeals.length > 0 ? (
//               <p className="text-gray-400 font-bold">You've reached the end of the feed!</p>
//             ) : (
//               <div className="text-center py-20 w-full bg-white rounded-2xl border border-gray-200 col-span-full">
//                 <p className="text-gray-500 font-bold">No active deals found for this category.</p>
//               </div>
//             )}
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }