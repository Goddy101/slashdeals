// components/DealCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { upvoteDealAction } from '@/app/actions/upvote';

interface DealCardProps {
  id: string;
  title: string;
  merchantName: string;
  originalPrice: number;
  dealPrice: number;
  upvotesCount: number;
  isPinned?: boolean;
  isEscrow?: boolean;
}

export default function DealCard({
  id,
  title,
  merchantName,
  originalPrice,
  dealPrice,
  upvotesCount: initialUpvotes,
  isPinned = false,
  isEscrow = false,
}: DealCardProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Check localStorage on load to see if they already voted for this deal
  useEffect(() => {
    const votedDeals = JSON.parse(localStorage.getItem('voted_deals') || '[]');
    if (votedDeals.includes(id)) {
      setHasUpvoted(true);
    }
  }, [id]);

  const handleUpvote = async () => {
    if (hasUpvoted) return; // Prevent double voting

    // Optimistic UI Update (feels instant to the user)
    setUpvotes(prev => prev + 1);
    setHasUpvoted(true);

    // Save to localStorage so they can't vote again if they refresh
    const votedDeals = JSON.parse(localStorage.getItem('voted_deals') || '[]');
    localStorage.setItem('voted_deals', JSON.stringify([...votedDeals, id]));

    // Silently tell the database in the background
    await upvoteDealAction(id);
  };

  // --- TELEMETRY TRACKER ---
  const handleCardClick = () => {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: id, eventType: 'click' }),
    }).catch(() => {}); // Fire and forget (won't break UI if offline)
  };

  const discount = originalPrice > 0 
    ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100) 
    : 0;

  return (
    <div className={`bg-white rounded-xl overflow-hidden border transition-all hover:shadow-md ${isPinned ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-200'}`}>
      <div className="p-5">
        
        {/* Badges */}
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {merchantName}
          </span>
          {isPinned && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide">
              Sponsored
            </span>
          )}
        </div>

        {/* Title & Pricing */}
        <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2 line-clamp-2">
          {title}
        </h3>
        
        <div className="flex items-end gap-2 mb-4">
          <span className="text-2xl font-black text-gray-900">
            NGN {dealPrice.toLocaleString()}
          </span>
          {originalPrice > dealPrice && (
            <span className="text-sm text-gray-400 line-through mb-1">
              NGN {originalPrice.toLocaleString()}
            </span>
          )}
          {discount > 0 && (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mb-1">
              -{discount}%
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button 
            onClick={handleUpvote}
            disabled={hasUpvoted}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-sm transition-colors flex-shrink-0
              ${hasUpvoted 
                ? 'bg-blue-50 text-blue-600 border border-blue-100 cursor-default' 
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <svg className="w-4 h-4" fill={hasUpvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {upvotes}
          </button>
          
          <a 
            href={isEscrow ? `/checkout/${id}` : `/api/deals/${id}/click`}
            target={isEscrow ? "_self" : "_blank"}
            rel="noopener noreferrer"
            onClick={handleCardClick} // <-- Telemetry click logged instantly here
            className="flex-1 bg-black text-white text-center font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            {isEscrow ? 'Buy via Escrow' : 'Claim Deal'}
          </a>
        </div>
      </div>
    </div>
  );
}









// 'use client';

// import { useState, useEffect } from 'react';
// import { upvoteDealAction } from '@/app/actions/upvote';

// interface DealCardProps {
//   id: string;
//   title: string;
//   merchantName: string;
//   originalPrice: number;
//   dealPrice: number;
//   upvotesCount: number;
//   isPinned?: boolean;
//   isEscrow?: boolean;
// }

// export default function DealCard({
//   id,
//   title,
//   merchantName,
//   originalPrice,
//   dealPrice,
//   upvotesCount: initialUpvotes,
//   isPinned = false,
//   isEscrow = false,
// }: DealCardProps) {
//   const [upvotes, setUpvotes] = useState(initialUpvotes);
//   const [hasUpvoted, setHasUpvoted] = useState(false);

//   // Check localStorage on load to see if they already voted for this deal
//   useEffect(() => {
//     const votedDeals = JSON.parse(localStorage.getItem('voted_deals') || '[]');
//     if (votedDeals.includes(id)) {
//       setHasUpvoted(true);
//     }
//   }, [id]);

//   const handleUpvote = async () => {
//     if (hasUpvoted) return; // Prevent double voting

//     // Optimistic UI Update (feels instant to the user)
//     setUpvotes(prev => prev + 1);
//     setHasUpvoted(true);

//     // Save to localStorage so they can't vote again if they refresh
//     const votedDeals = JSON.parse(localStorage.getItem('voted_deals') || '[]');
//     localStorage.setItem('voted_deals', JSON.stringify([...votedDeals, id]));

//     // Silently tell the database in the background
//     await upvoteDealAction(id);
//   };

//   const discount = originalPrice > 0 
//     ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100) 
//     : 0;

//   return (
//     <div className={`bg-white rounded-xl overflow-hidden border transition-all hover:shadow-md ${isPinned ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-200'}`}>
//       <div className="p-5">
        
//         {/* Badges */}
//         <div className="flex justify-between items-start mb-3">
//           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
//             {merchantName}
//           </span>
//           {isPinned && (
//             <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide">
//               Sponsored
//             </span>
//           )}
//         </div>

//         {/* Title & Pricing */}
//         <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2 line-clamp-2">
//           {title}
//         </h3>
        
//         <div className="flex items-end gap-2 mb-4">
//           <span className="text-2xl font-black text-gray-900">
//            {dealPrice.toLocaleString()}
//             NGN {dealPrice.toLocaleString()}
//           </span>
//           {originalPrice > dealPrice && (
//             <span className="text-sm text-gray-400 line-through mb-1">
//               NGN {originalPrice.toLocaleString()}
//             </span>
//           )}
//           {discount > 0 && (
//             <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mb-1">
//               -{discount}%
//             </span>
//           )}
//         </div>

//         {/* Action Buttons */}
//         <div className="flex items-center gap-3 mt-4">
//           <button 
//             onClick={handleUpvote}
//             disabled={hasUpvoted}
//             className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-sm transition-colors flex-shrink-0
//               ${hasUpvoted 
//                 ? 'bg-blue-50 text-blue-600 border border-blue-100 cursor-default' 
//                 : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'}`}
//           >
//             <svg className="w-4 h-4" fill={hasUpvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
//             </svg>
//             {upvotes}
//           </button>
          
//           <a 
//             href={isEscrow ? `/checkout/${id}` : `/api/deals/${id}/click`}
//             target={isEscrow ? "_self" : "_blank"}
//             rel="noopener noreferrer"
//             className="flex-1 bg-black text-white text-center font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm"
//           >
//             {isEscrow ? 'Buy via Escrow' : 'Claim Deal'}
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import { useState } from 'react';
// import { formatNaira, calculateDiscount } from '@/utils/currency';

// interface DealCardProps {
//   id: string;
//   title: string;
//   merchantName: string;
//   originalPrice: number;
//   dealPrice: number;
//   upvotesCount: number;
//   isPinned?: boolean;
//   isEscrow?: boolean;
// }

// export default function DealCard({
//   id, title, merchantName, originalPrice, dealPrice, upvotesCount, isPinned, isEscrow
// }: DealCardProps) {
//   const [upvotes, setUpvotes] = useState(upvotesCount);
//   const discount = calculateDiscount(originalPrice, dealPrice);

//   const handleUpvote = async () => {
//     // Optimistic UI update
//     setUpvotes(upvotes + 1);
//     // TODO: Call your Supabase toggle_deal_upvote RPC here
//   };

//   return (
//     <div className={`relative flex flex-col bg-white rounded-xl overflow-hidden border transition-all hover:shadow-md ${isPinned ? 'border-amber-400 shadow-sm ring-1 ring-amber-400' : 'border-gray-200'}`}>
      
//       {/* Premium Badge */}
//       {isPinned && (
//         <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-bl-lg">
//           Sponsored
//         </div>
//       )}

//       <div className="p-5 flex-grow">
//         <p className="text-sm font-semibold text-gray-500 mb-1">{merchantName}</p>
//         <h3 className="font-bold text-gray-900 text-lg leading-tight mb-3 line-clamp-2">
//           {title}
//         </h3>

//         <div className="flex items-end gap-2 mb-4">
//           <span className="text-2xl font-black text-green-600">
//             {formatNaira(dealPrice)}
//           </span>
//           {originalPrice > dealPrice && (
//             <span className="text-sm text-gray-400 line-through mb-1">
//               {formatNaira(originalPrice)}
//             </span>
//           )}
//           {discount > 0 && (
//             <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded ml-auto">
//               -{discount}%
//             </span>
//           )}
//         </div>
//       </div>

//       <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center">
//         <button 
//           onClick={handleUpvote}
//           className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium transition-colors"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
//           </svg>
//           {upvotes}
//         </button>

//         <a 
//           href={`/deal/${id}`} 
//           className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
//             isEscrow 
//               ? 'bg-blue-600 hover:bg-blue-700 text-white' 
//               : 'bg-black hover:bg-gray-800 text-white'
//           }`}
//         >
//           {isEscrow ? 'Buy Securely' : 'Get Deal'}
//         </a>
//       </div>
//     </div>
//   );
// }