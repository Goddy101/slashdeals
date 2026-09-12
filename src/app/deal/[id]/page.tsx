// src/app/deal/[id]/page.tsx
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import DealClient from './DealClient';

type Props = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// 1. DYNAMIC SEO & OPEN GRAPH GENERATOR
// ============================================================================
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from('deals')
    .select('*, profiles(business_name)')
    .eq('id', id)
    .single();

  if (!deal) return { title: 'Deal Not Found | SlashDeals' };

  const discount = deal.original_price > deal.deal_price 
    ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100) 
    : 0;

  const title = `${deal.title} - ₦${deal.deal_price.toLocaleString()}`;
  const description = discount > 0 
    ? `🔥 ${discount}% OFF! Was ₦${deal.original_price.toLocaleString()}. Protected by SlashDeals Escrow. Sold by ${deal.profiles?.business_name || 'Verified Vendor'}.`
    : `Secure this deal for ₦${deal.deal_price.toLocaleString()} via SlashDeals Escrow. Sold by ${deal.profiles?.business_name || 'Verified Vendor'}.`;

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slashdeals.com.ng';
  
  // Use your automated Flyer Generator as the preview image!
  const ogImageUrl = `${appUrl}/api/flyer/generate?deal_id=${deal.id}&format=banner&template=flash&color=%2322C55E`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/deal/${deal.id}`,
      siteName: 'SlashDeals',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      locale: 'en_NG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// ============================================================================
// 2. SERVER DATA FETCHER
// ============================================================================
export default async function SingleDealPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, profiles(business_name, is_verified, created_at)')
    .eq('id', id)
    .single();

  if (error || !deal || deal.status === 'hidden') notFound();

  // Pass the fully loaded deal into the client component
  return <DealClient initialDeal={deal} />;
}










// // src/app/deal/[id]/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// import Link from 'next/link';
// import SidebarAd from '@/components/SidebarAd';
// //port JsonLdSchema from '@/components/JsonLdSchema';
// import JsonLdSchema from '@/components/seo/JsonLdSchema';

// export default function SingleDealPage() {
//   const params = useParams();
//   const router = useRouter();
//   const dealId = params.id as string;
//   const supabase = createClient();

//   const [deal, setDeal] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
  
//   // Report State (Physical Deals)
//   const [isReporting, setIsReporting] = useState(false);
//   const [hasReported, setHasReported] = useState(false);

//   // Escrow State (Digital Assets)
//   const [isInitiating, setIsInitiating] = useState(false);

//   useEffect(() => {
//     async function fetchDeal() {
//       const { data, error } = await supabase
//         .from('deals')
//         .select('*, profiles(business_name, is_verified)') 
//         .eq('id', dealId)
//         .single();
        
//       if (error) {
//         console.error("SUPABASE ERROR:", error.message);
//         alert("Error loading deal: " + error.message);
//         setLoading(false);
//         return;
//       }

//       if (!data || data.status === 'hidden') {
//         alert("This deal is hidden or no longer exists.");
//         router.push('/'); 
//         return;
//       }
        
//       setDeal(data);
//       setLoading(false);

//       // --- TELEMETRY: LOG PAGE VIEW ---
//       fetch('/api/telemetry', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ listingId: dealId, eventType: 'view' }),
//       }).catch(() => {});
//     }

//     if (dealId) {
//       fetchDeal();
//     }
//   }, [dealId, router, supabase]);

//   const handleReport = async () => {
//     if (!confirm('Are you sure you want to report this deal as a scam or broken?')) return;
//     setIsReporting(true);
//     try {
//       const res = await fetch('/api/deals/report', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ deal_id: deal.id }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setHasReported(true);
//         if (data.hidden) {
//           alert('Thank you. This deal has received multiple reports and has been automatically removed.');
//           router.push('/');
//         } else {
//           alert('Report submitted. Our team will review this deal.');
//         }
//       }
//     } catch (err) {
//       alert('Failed to submit report.');
//     }
//     setIsReporting(false);
//   };

//   const handleInitiateEscrow = () => {
//     setIsInitiating(true);
//     fetch('/api/telemetry', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ listingId: deal.id, eventType: 'checkout_intent' }),
//     }).catch(() => {});
//     router.push(`/escrow/${deal.id}`);
//   };

//   const handleBuySecurelyClick = () => {
//     fetch('/api/telemetry', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ listingId: deal.id, eventType: 'checkout_intent' }),
//     }).catch(() => {});
//   };

//   if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Loading Deal...</div>;
//   if (!deal) return null;

//   // ============================================================================
//   // VIEW 1: PREMIUM DIGITAL ASSET DASHBOARD
//   // ============================================================================
//   if (deal.category === 'Startups') {
//     const isSocial = deal.asset_type === 'social_account';
//     const isStartup = !isSocial;
//     const annualRevenue = (deal.monthly_revenue || 0) * 12;
//     const multiple = annualRevenue > 0 ? (deal.deal_price / annualRevenue).toFixed(1) : 'N/A';
//     const escrowFee = deal.deal_price * 0.025;
//     const totalCost = deal.deal_price + escrowFee;

//     return (
//       <> 
//         <JsonLdSchema deal={deal} />
//         <div className="min-h-screen bg-gray-50 font-sans pb-24">
//           <div className="bg-[#090E17] pt-12 pb-24 px-4 border-b border-white/10 relative overflow-hidden">
//             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
//             <div className="max-w-6xl mx-auto relative z-10">
//               <Link href="/startups" className="text-gray-400 hover:text-white font-bold text-sm mb-8 inline-flex items-center gap-2 transition-colors">
//                 &larr; Back to Digital Assets
//               </Link>
//               <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4">
//                 <div>
//                   <div className="flex items-center gap-3 mb-4">
//                     <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${isStartup ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'}`}>
//                       {isStartup ? deal.asset_type.replace('_', ' ') : `${deal.platform} Page`}
//                     </span>
//                     {deal.is_verified_revenue && (
//                       <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Verified Financials</span>
//                     )}
//                   </div>
//                   <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 leading-tight">{deal.title}</h1>
//                   <p className="text-gray-400 text-lg flex items-center gap-2">Listed by <strong className="text-white">{deal.profiles?.business_name || 'Anonymous Founder'}</strong>{deal.profiles?.is_verified && <span className="text-blue-400">✓</span>}</p>
//                 </div>
//                 <div className="text-left md:text-right">
//                   <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Asking Price</p>
//                   <p className="text-4xl md:text-5xl font-black text-white tracking-tight">₦{deal.deal_price.toLocaleString()}</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <div className="lg:col-span-2 space-y-8">
//                 <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm">
//                   <h2 className="text-xl font-black text-gray-900 mb-6">Key Metrics</h2>
//                   {isStartup ? (
//                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Rev</p><p className="text-2xl font-black text-emerald-600">{deal.monthly_revenue > 0 ? `₦${deal.monthly_revenue.toLocaleString()}` : 'Pre-Revenue'}</p></div>
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ARR Multiple</p><p className="text-2xl font-black text-gray-900">{multiple !== 'N/A' ? `${multiple}x` : 'N/A'}</p></div>
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Traffic / Users</p><p className="text-2xl font-black text-gray-900">{deal.monthly_traffic?.toLocaleString() || 0}</p></div>
//                     </div>
//                   ) : (
//                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Followers</p><p className="text-2xl font-black text-fuchsia-600">{deal.follower_count?.toLocaleString() || 0}</p></div>
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Engagement Rate</p><p className="text-2xl font-black text-gray-900">{deal.engagement_rate || 0}%</p></div>
//                       <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Platform</p><p className="text-2xl font-black capitalize text-gray-900">{deal.platform}</p></div>
//                     </div>
//                   )}
//                   {isStartup && deal.tech_stack && (
//                     <div className="mt-8 pt-8 border-t border-gray-100">
//                       <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tech Stack</p>
//                       <div className="flex flex-wrap gap-2">
//                         {deal.tech_stack.split(',').map((tech: string, i: number) => (
//                           <span key={i} className="bg-gray-100 text-gray-700 font-bold text-sm px-4 py-2 rounded-xl">{tech.trim()}</span>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//                 <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm">
//                   <h2 className="text-xl font-black text-gray-900 mb-4">About this Asset</h2>
//                   <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{deal.description}</p>
//                 </div>
//               </div>

//               <div className="lg:col-span-1 space-y-6">
//                 <div className="sticky top-8 bg-zinc-900 p-8 rounded-[32px] shadow-2xl border border-zinc-800 text-white">
//                   <div className="flex items-center gap-3 mb-6 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
//                     <span className="text-3xl">🛡️</span>
//                     <div><h3 className="font-black text-blue-400">Escrow Secured</h3><p className="text-xs text-blue-200/70 mt-1">48-Hr Digital Transfer Protocol</p></div>
//                   </div>
//                   <div className="space-y-4 mb-8">
//                     <div className="flex justify-between text-zinc-400 font-medium"><span>Asset Price</span><span className="text-white">₦{deal.deal_price.toLocaleString()}</span></div>
//                     <div className="flex justify-between text-zinc-400 font-medium"><span>Escrow Fee (2.5%)</span><span className="text-white">₦{escrowFee.toLocaleString()}</span></div>
//                     <div className="pt-4 border-t border-zinc-800 flex justify-between items-center"><span className="font-bold text-zinc-300">Total</span><span className="text-2xl font-black text-emerald-400">₦{totalCost.toLocaleString()}</span></div>
//                   </div>
//                   <button onClick={handleInitiateEscrow} disabled={isInitiating} className="w-full bg-white text-black font-black text-lg py-5 rounded-2xl hover:bg-gray-200 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-white/10">
//                     {isInitiating ? 'Securing Vault...' : 'Acquire Asset Now'}
//                   </button>
//                 </div>
                
//                 {/* 🚀 Ad Injection for Digital Assets */}
//                 <SidebarAd category={deal.category} dealOwnerId={deal.user_id} />
//               </div>
//             </div>
//           </div>
//         </div>
//       </>
//     );
//   }

//   // ============================================================================
//   // VIEW 2: STANDARD MARKETPLACE DEALS
//   // ============================================================================
//   const discount = deal.original_price > deal.deal_price ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100) : 0;

//   return (
//     <>
//       <JsonLdSchema deal={deal} />
//       <div className="min-h-screen bg-gray-50 py-10 px-4">
//         <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
          
//           {/* Left Side: Main Deal Card (2/3 width) */}
//           <div className="lg:w-2/3 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-fit">
//             <div className="md:w-1/2 bg-gray-100 flex items-center justify-center p-8 aspect-square relative">
//               {deal.is_escrow_enabled && (
//                 <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md z-10">
//                   🛡️ ESCROW PROTECTED
//                 </div>
//               )}
//               {deal.image_url ? (
//                 <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover rounded-xl shadow-sm" />
//               ) : (
//                 <span className="text-gray-400 font-bold">No Image Provided</span>
//               )}
//             </div>

//             <div className="md:w-1/2 p-6 sm:p-10 flex flex-col justify-between">
//               <div className="space-y-4">
//                 <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{deal.title}</h1>
                
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm font-medium text-gray-500">Sold by</span>
//                   <span className="font-bold text-gray-900 flex items-center gap-1">
//                     {deal.profiles?.business_name || 'Verified Vendor'}
//                     {deal.profiles?.is_verified && <span className="text-blue-500 text-lg leading-none">✓</span>}
//                   </span>
//                 </div>

//                 <div className="bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-100 space-y-3 mt-6">
//                   <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                     <span className="text-3xl sm:text-4xl font-black text-gray-900 break-words">
//                       ₦{deal.deal_price.toLocaleString()}
//                     </span>
//                     {deal.original_price > deal.deal_price && (
//                       <span className="text-base sm:text-lg text-gray-400 line-through">
//                         ₦{deal.original_price.toLocaleString()}
//                       </span>
//                     )}
//                   </div>
//                   {discount > 0 && (
//                     <div className="inline-block bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full text-sm">
//                       You save {discount}%
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="mt-8 space-y-4">
//                 {deal.is_escrow_enabled ? (
//                   <Link 
//                     href={`/checkout/${deal.id}`} 
//                     onClick={handleBuySecurelyClick}
//                     className="block w-full text-center bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md text-lg"
//                   >
//                     Buy Now Securely 🔒
//                   </Link>
//                 ) : (
//                   <a 
//                     href={deal.url || deal.deal_url} 
//                     target="_blank" 
//                     rel="noopener noreferrer" 
//                     onClick={handleBuySecurelyClick}
//                     className="block w-full text-center bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-md text-lg"
//                   >
//                     Go to Deal ↗
//                   </a>
//                 )}

//                 {/* THE REPORT BUTTON */}
//                 <div className="flex justify-center pt-4 border-t border-gray-100">
//                   <button onClick={handleReport} disabled={isReporting || hasReported} className={`text-sm font-bold flex items-center gap-2 transition-colors ${hasReported ? 'text-green-600' : 'text-gray-400 hover:text-red-500'}`}>
//                     {hasReported ? (<><span>✅</span> Reported</>) : (<><span>🚩</span> {isReporting ? 'Reporting...' : 'Report Scam or Broken Link'}</>)}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Right Side: Sidebar Ad Injection (1/3 width) */}
//           <div className="lg:w-1/3 space-y-6">
//             <SidebarAd category={deal.category} dealOwnerId={deal.user_id} />
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }


 