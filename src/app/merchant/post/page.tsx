// app/merchant/post/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
// Ensure this path matches your folder structure
import { FlyerStudioModal } from '@/components/merchant/FlyerStudioModal';

export default function PostDealPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Guardrail States
  const [completedOrders, setCompletedOrders] = useState(0);
  const [forceEscrow, setForceEscrow] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [isEscrowEnabled, setIsEscrowEnabled] = useState(true);
  const [isPhysical, setIsPhysical] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Viral Loop State
  const [publishedDealId, setPublishedDealId] = useState<string | null>(null);

  useEffect(() => {
    async function checkMerchantStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // GUARDRAIL 1: Count successful orders to determine if we lock Escrow
      const { count } = await supabase
        .from('escrows')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id) 
        .eq('status', 'completed');
      
      const successfulOrders = count || 0;
      setCompletedOrders(successfulOrders);
      
      if (successfulOrders < 3) {
        setForceEscrow(true);
        setIsEscrowEnabled(true);
      }
      setLoading(false);
    }
    checkMerchantStatus();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const origPrice = Number(originalPrice);
    const dPrice = Number(dealPrice);

    // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
    const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
    const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

    const { data: newDeal, error } = await supabase.from('deals').insert([{
      user_id: userId,
      title,
      original_price: origPrice,
      deal_price: dPrice,
      is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
      // Note: Make sure 'is_physical' exists in your deals schema, 
      // or map it to your category/asset_class field if needed.
      status: dealStatus 
    }]).select('id').single();

    if (error || !newDeal) {
      alert('Error posting deal');
    } else {
      // --- TELEMETRY: LOG CREATION / PUBLISH EVENT ---
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: newDeal.id, eventType: 'view' }), 
      }).catch(() => {});

      if (dealStatus === 'pending_review') {
        alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
        router.push('/merchant/orders');
      } else {
        // VIRAL LOOP TRIGGER: Don't route away! Show the Flyer Studio.
        setPublishedDealId(newDeal.id);
      }
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-10 font-bold">Verifying account status...</div>;

  // --- VIRAL LOOP UI ---
  // If a deal was successfully published, show the Success UI and Flyer Studio
  if (publishedDealId) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-green-50 text-green-800 p-8 rounded-3xl border border-green-200">
          <h2 className="text-3xl font-black mb-3">🎉 Deal is Live!</h2>
          <p className="text-lg">Your item is now protected by the SlashDeals Escrow Vault.</p>
        </div>
        
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm text-left">
          <h3 className="text-xl font-bold mb-2">Generate Your Marketing Flyer</h3>
          <p className="text-gray-500 mb-6">
            Buyers trust escrow. Download your custom flyer with the Escrow Trust badge and post it to your WhatsApp status to start getting sales immediately.
          </p>
          
          <FlyerStudioModal
            isOpen={true}
            dealId={publishedDealId}
            onClose={() => router.push('/merchant/orders')}
          />
        </div>
      </div>
    );
  }

  // --- DEFAULT POST DEAL FORM ---
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-black text-gray-900 mb-6">Post a Deal</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        
        {/* Deal Info */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title</label>
          <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" placeholder="e.g., iPhone 15 Pro Max - 256GB" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
            <input required type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Deal Price (₦)</label>
            <input required type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Product Type</label>
          <select value={isPhysical ? 'yes' : 'no'} onChange={e => setIsPhysical(e.target.value === 'yes')} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black">
            <option value="yes">Physical Item (Requires Delivery/Meetup)</option>
            <option value="no">Digital / Service (Instant Transfer)</option>
          </select>
        </div>

        {/* GUARDRAIL 1 UI: Escrow Enforcement */}
        <div className={`p-5 rounded-2xl border ${forceEscrow ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">🛡️ Escrow Protection</p>
              <p className="text-sm text-gray-500 mt-1">
                {forceEscrow 
                  ? 'Mandatory for new sellers to build buyer trust.' 
                  : 'Highly recommended. Buyers trust Escrow deals 4x more.'}
              </p>
            </div>
            <input 
              type="checkbox" 
              checked={forceEscrow ? true : isEscrowEnabled} 
              onChange={e => setIsEscrowEnabled(e.target.checked)}
              disabled={forceEscrow}
              className="w-6 h-6 rounded text-black focus:ring-black cursor-pointer disabled:opacity-50"
            />
          </div>
          {forceEscrow && (
            <div className="mt-3 text-xs font-bold text-blue-800 bg-blue-100 p-2 rounded-lg inline-block">
              🔒 Locked until you complete 3 successful orders. ({completedOrders}/3 completed)
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-black text-white font-black py-4 rounded-xl text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer">
          {submitting ? 'Posting...' : 'Publish Deal'}
        </button>
      </form>
    </div>
  );
}




// // app/merchant/post/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';

// export default function PostDealPage() {
//   const supabase = createClient();
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
  
//   // Guardrail States
//   const [completedOrders, setCompletedOrders] = useState(0);
//   const [forceEscrow, setForceEscrow] = useState(false);

//   // Form States
//   const [title, setTitle] = useState('');
//   const [originalPrice, setOriginalPrice] = useState('');
//   const [dealPrice, setDealPrice] = useState('');
//   const [isEscrowEnabled, setIsEscrowEnabled] = useState(true);
//   const [isPhysical, setIsPhysical] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     async function checkMerchantStatus() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.push('/login');
//         return;
//       }
//       setUserId(user.id);

//       // GUARDRAIL 1: Count successful orders to determine if we lock Escrow
//       const { count } = await supabase
//         .from('escrows')
//         .select('*', { count: 'exact', head: true })
//         .eq('merchant_id', user.id)
//         .eq('status', 'completed');
      
//       const successfulOrders = count || 0;
//       setCompletedOrders(successfulOrders);
      
//       if (successfulOrders < 3) {
//         setForceEscrow(true);
//         setIsEscrowEnabled(true);
//       }
//       setLoading(false);
//     }
//     checkMerchantStatus();
//   }, [router, supabase]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);

//     const origPrice = Number(originalPrice);
//     const dPrice = Number(dealPrice);

//     // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
//     const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
//     const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

//     const { data: newDeal, error } = await supabase.from('deals').insert([{
//       user_id: userId,
//       title,
//       original_price: origPrice,
//       deal_price: dPrice,
//       is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
//       is_physical: isPhysical,
//       status: dealStatus // Will hide it from public feed if flagged
//     }]).select('id').single();

//     if (error || !newDeal) {
//       alert('Error posting deal');
//     } else {
//       // --- TELEMETRY: LOG CREATION / PUBLISH EVENT ---
//       fetch('/api/telemetry', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ listingId: newDeal.id, eventType: 'view' }), // Using 'view' or custom intent type
//       }).catch(() => {});

//       if (dealStatus === 'pending_review') {
//         alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
//       } else {
//         alert('Deal is live!');
//       }
//       router.push('/merchant/orders');
//     }
//     setSubmitting(false);
//   };

//   if (loading) return <div className="p-10 font-bold">Verifying account status...</div>;

//   return (
//     <div className="max-w-3xl mx-auto p-4 sm:p-8">
//       <h1 className="text-3xl font-black text-gray-900 mb-6">Post a Deal</h1>
      
//       <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        
//         {/* Deal Info */}
//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title</label>
//           <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//         </div>

//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
//             <input required type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//           </div>
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Deal Price (₦)</label>
//             <input required type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Product Type</label>
//           <select value={isPhysical ? 'yes' : 'no'} onChange={e => setIsPhysical(e.target.value === 'yes')} className="w-full px-4 py-3 border rounded-xl">
//             <option value="yes">Physical Item (Requires Shipping)</option>
//             <option value="no">Digital / Service (No Shipping)</option>
//           </select>
//         </div>

//         {/* GUARDRAIL 1 UI: Escrow Enforcement */}
//         <div className={`p-5 rounded-2xl border ${forceEscrow ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="font-bold text-gray-900">🛡️ Escrow Protection</p>
//               <p className="text-sm text-gray-500 mt-1">
//                 {forceEscrow 
//                   ? 'Mandatory for new sellers to build buyer trust.' 
//                   : 'Highly recommended. Buyers trust Escrow deals 4x more.'}
//               </p>
//             </div>
//             <input 
//               type="checkbox" 
//               checked={forceEscrow ? true : isEscrowEnabled} 
//               onChange={e => setIsEscrowEnabled(e.target.checked)}
//               disabled={forceEscrow}
//               className="w-6 h-6 rounded text-black focus:ring-black cursor-pointer disabled:opacity-50"
//             />
//           </div>
//           {forceEscrow && (
//             <div className="mt-3 text-xs font-bold text-blue-800 bg-blue-100 p-2 rounded-lg inline-block">
//               🔒 Locked until you complete 3 successful orders. ({completedOrders}/3 completed)
//             </div>
//           )}
//         </div>

//         <button type="submit" disabled={submitting} className="w-full bg-black text-white font-black py-4 rounded-xl text-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
//           {submitting ? 'Posting...' : 'Publish Deal'}
//         </button>
//       </form>
//     </div>
//   );
// }








// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';

// export default function PostDealPage() {
//   const supabase = createClient();
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
  
//   // Guardrail States
//   const [completedOrders, setCompletedOrders] = useState(0);
//   const [forceEscrow, setForceEscrow] = useState(false);

//   // Form States
//   const [title, setTitle] = useState('');
//   const [originalPrice, setOriginalPrice] = useState('');
//   const [dealPrice, setDealPrice] = useState('');
//   const [isEscrowEnabled, setIsEscrowEnabled] = useState(true);
//   const [isPhysical, setIsPhysical] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     async function checkMerchantStatus() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.push('/login');
//         return;
//       }
//       setUserId(user.id);

//       // GUARDRAIL 1: Count successful orders to determine if we lock Escrow
//       const { count } = await supabase
//         .from('escrows')
//         .select('*', { count: 'exact', head: true })
//         .eq('merchant_id', user.id)
//         .eq('status', 'completed');
      
//       const successfulOrders = count || 0;
//       setCompletedOrders(successfulOrders);
      
//       if (successfulOrders < 3) {
//         setForceEscrow(true);
//         setIsEscrowEnabled(true);
//       }
//       setLoading(false);
//     }
//     checkMerchantStatus();
//   }, [router, supabase]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);

//     const origPrice = Number(originalPrice);
//     const dPrice = Number(dealPrice);

//     // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
//     const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
//     const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

//     const { error } = await supabase.from('deals').insert([{
//       user_id: userId,
//       title,
//       original_price: origPrice,
//       deal_price: dPrice,
//       is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
//       is_physical: isPhysical,
//       status: dealStatus // Will hide it from public feed if flagged
//     }]);

//     if (error) {
//       alert('Error posting deal');
//     } else {
//       if (dealStatus === 'pending_review') {
//         alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
//       } else {
//         alert('Deal is live!');
//       }
//       router.push('/merchant/orders');
//     }
//     setSubmitting(false);
//   };

//   if (loading) return <div className="p-10 font-bold">Verifying account status...</div>;

//   return (
//     <div className="max-w-3xl mx-auto p-4 sm:p-8">
//       <h1 className="text-3xl font-black text-gray-900 mb-6">Post a Deal</h1>
      
//       <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        
//         {/* Deal Info */}
//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title</label>
//           <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//         </div>

//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
//             <input required type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//           </div>
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Deal Price (₦)</label>
//             <input required type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Product Type</label>
//           <select value={isPhysical ? 'yes' : 'no'} onChange={e => setIsPhysical(e.target.value === 'yes')} className="w-full px-4 py-3 border rounded-xl">
//             <option value="yes">Physical Item (Requires Shipping)</option>
//             <option value="no">Digital / Service (No Shipping)</option>
//           </select>
//         </div>

//         {/* GUARDRAIL 1 UI: Escrow Enforcement */}
//         <div className={`p-5 rounded-2xl border ${forceEscrow ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="font-bold text-gray-900">🛡️ Escrow Protection</p>
//               <p className="text-sm text-gray-500 mt-1">
//                 {forceEscrow 
//                   ? 'Mandatory for new sellers to build buyer trust.' 
//                   : 'Highly recommended. Buyers trust Escrow deals 4x more.'}
//               </p>
//             </div>
//             <input 
//               type="checkbox" 
//               checked={forceEscrow ? true : isEscrowEnabled} 
//               onChange={e => setIsEscrowEnabled(e.target.checked)}
//               disabled={forceEscrow}
//               className="w-6 h-6 rounded text-black focus:ring-black cursor-pointer disabled:opacity-50"
//             />
//           </div>
//           {forceEscrow && (
//             <div className="mt-3 text-xs font-bold text-blue-800 bg-blue-100 p-2 rounded-lg inline-block">
//               🔒 Locked until you complete 3 successful orders. ({completedOrders}/3 completed)
//             </div>
//           )}
//         </div>

//         <button type="submit" disabled={submitting} className="w-full bg-black text-white font-black py-4 rounded-xl text-lg hover:bg-gray-800 disabled:opacity-50">
//           {submitting ? 'Posting...' : 'Publish Deal'}
//         </button>
//       </form>
//     </div>
//   );
// }