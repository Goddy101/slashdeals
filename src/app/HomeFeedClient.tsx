// app/HomeFeedClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const DEALS_PER_PAGE = 20;
const CATEGORIES = ['All', 'Tech', 'Fashion', 'Startups', 'Food', 'General'];

// Extracted Component for maximum rendering performance
const DealCard = ({ deal, isSpotlight }: { deal: any, isSpotlight?: boolean }) => {
  const discount = deal.original_price > deal.deal_price 
    ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100) 
    : 0;
    
  const isFlashBumped = deal.bumped_at && new Date(deal.bumped_at).getTime() > Date.now() - 60 * 60 * 1000;
  
  // Handle single string or array of images
  const primaryImage = deal.image_url || (deal.images && deal.images[0]) || null;
  
  // Earned Trust Logic
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
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border flex flex-col h-full ${
      isSpotlight ? 'border-amber-400 ring-2 ring-amber-400/20' : 
      isFlashBumped ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-gray-200'
    }`}>
      <Link href={`/deal/${deal.id}`} onClick={handleCardClick} className="block flex-grow">
        <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
          {isSpotlight && (
            <div className="absolute top-3 left-3 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
              <span>⭐</span> SPOTLIGHT
            </div>
          )}
          {!isSpotlight && isFlashBumped && (
            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
              <span>⚡</span> FLASH BUMP
            </div>
          )}
          
          {deal.is_escrow_enabled && (
            <div className="absolute top-3 right-3 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10 uppercase tracking-widest">
              🛡️ Escrow
            </div>
          )}
          
          {primaryImage ? (
            <img src={primaryImage} alt={deal.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-gray-300 font-bold">No Image</span>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-sm hover:underline">{deal.title}</h3>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-xl font-black text-gray-900">₦{deal.deal_price.toLocaleString()}</span>
            {discount > 0 && (
              <>
                <span className="text-sm text-gray-400 line-through mb-0.5 hidden sm:inline-block">₦{deal.original_price.toLocaleString()}</span>
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md mb-1">-{discount}%</span>
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          
          {/* Trust Engine Output */}
          <div className="text-xs font-medium text-gray-500 truncate pr-2 flex flex-col justify-center">
            <span className="truncate">{deal.profiles?.business_name || 'Verified Vendor'}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {isProMerchant ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                  ⭐ PRO ({successfulSales})
                </span>
              ) : (
                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                  LEVEL 1 ({successfulSales})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              👍 {deal.upvotes_count || 0}
            </span>
            <a 
              href={`https://wa.me/?text=Check out this massive deal on SlashDeals: ₦${deal.deal_price.toLocaleString()} - ${process.env.NEXT_SITE_URL}/deal/${deal.id}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} 
              className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
              title="Share to WhatsApp"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.397 0 .015 5.38.015 12.012c0 2.122.553 4.19 1.603 6.014L.197 24l6.126-1.605a11.96 11.96 0 005.708 1.442h.004c6.632 0 12.013-5.38 12.013-12.012C24.048 5.38 18.666 0 12.031 0z"/></svg>
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
  
  // Data States seeded from Server
  const [takeover] = useState<any>(initialTakeover);
  const [spotlightDeals, setSpotlightDeals] = useState<any[]>(initialSpotlights);
  const [feedDeals, setFeedDeals] = useState<any[]>(initialDeals);
  
  // UI States
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'trending' | 'newest'>(initialSort);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialDeals.length === DEALS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state when URL params change (Server passes new props)
  useEffect(() => {
    setFeedDeals(initialDeals);
    setSpotlightDeals(initialSpotlights);
    setHasMore(initialDeals.length === DEALS_PER_PAGE);
    setPage(1);
    setActiveCategory(initialCategory);
    setSortBy(initialSort);
  }, [initialDeals, initialSpotlights, initialCategory, initialSort]);

  // Route updates back to Server for new data
  const handleFilterChange = (newCategory: string, newSort: string) => {
    setActiveCategory(newCategory);
    setSortBy(newSort as 'trending' | 'newest');
    router.push(`/?category=${newCategory}&sort=${newSort}`);
  };

  // Client-side pagination logic
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
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* 1. Platform Takeover Banner */}
      {takeover && (
        <div 
          className="w-full p-4 text-center cursor-pointer"
          style={{ backgroundColor: takeover.brand_hex_color || '#000', color: '#fff' }}
          onClick={() => router.push(`/takeover/${takeover.id}`)}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded hidden sm:inline-block">SPONSORED BRAND TAKEOVER</span>
            <h2 className="text-sm md:text-base font-black truncate px-4">{takeover.brand_headline}</h2>
            <span className="text-sm font-bold border border-white/50 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors shrink-0">Shop Now &rarr;</span>
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Never Pay Full Price.
          </h1>
          <p className="text-gray-500 font-medium">
            Found a crazy price slash on Jumia, Konga, or IG? Drop the link below to share it (or list your own product).
          </p>

          <form onSubmit={handleUrlSubmit} className="relative max-w-xl mx-auto">
            <input 
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste URL (e.g. jumia.com.ng/item or wa.me/234...)"
              className="w-full py-4 pl-4 pr-32 bg-gray-100 border-2 border-transparent rounded-2xl focus:border-black focus:bg-white outline-none transition-all font-medium text-gray-900"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-black text-white font-bold px-6 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Post Deal
            </button>
          </form>
          {urlError && <p className="text-red-500 text-sm font-bold animate-pulse">{urlError}</p>}

          <div className="pt-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
            <span>Are you a registered merchant?</span>
            <Link href="/login" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
              Access your Dashboard <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

        {/* 3. Category Scroller */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => handleFilterChange(cat, sortBy)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
                activeCategory === cat 
                  ? 'bg-black text-white' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4. The Spotlight Arena */}
        {spotlightDeals.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-black text-gray-900">Featured Spotlight</h2>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md border border-amber-200">
                ⭐ 24-Hour Top Picks
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {spotlightDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} isSpotlight={true} />
              ))}
            </div>
          </section>
        )}

        {/* 5. The Organic Feed */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-gray-900">
                {activeCategory === 'All' ? 'Live Feed' : `${activeCategory} Deals`}
              </h2>
              <p className="text-xs font-medium text-gray-500 mt-1">Real-time active listings and flash bumps</p>
            </div>
            
            <select 
              value={sortBy}
              onChange={(e) => handleFilterChange(activeCategory, e.target.value)}
              className="bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 outline-none cursor-pointer hover:border-gray-300 focus:ring-2 focus:ring-black transition-all"
            >
              <option value="trending">Sort by: Trending (Bumps)</option>
              <option value="newest">Sort by: Newest Arrivals</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {feedDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} isSpotlight={false} />
            ))}
          </div>

          {/* 6. Pagination Footer */}
          <div className="mt-12 flex justify-center pb-8">
            {loadingMore ? (
              <div className="px-6 py-3 font-bold text-gray-500 bg-gray-100 rounded-full flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Loading more...
              </div>
            ) : hasMore ? (
              <button 
                onClick={loadMoreDeals}
                className="bg-white border-2 border-gray-200 text-gray-700 hover:border-black hover:text-black font-bold px-8 py-3 rounded-full transition-colors shadow-sm"
              >
                Load More Deals
              </button>
            ) : feedDeals.length > 0 ? (
              <p className="text-gray-400 font-bold">You've reached the end of the feed!</p>
            ) : (
              <div className="text-center py-20 w-full bg-white rounded-2xl border border-gray-200 col-span-full">
                <p className="text-gray-500 font-bold">No active deals found for this category.</p>
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