// app/checkout/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function EscrowCheckoutPage() {
  const params = useParams();
  const dealId = params.id as string;
  const supabase = createClient();

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Fetch the deal details on load
  // useEffect(() => {
  //   async function fetchDeal() {
  //     const { data, error } = await supabase
  //       .from('deals')
  //       .select('id, title, deal_price, merchant_name, user_id, image_url')
  //       .eq('id', dealId)
  //       .single();
        
  //     if (data) setDeal(data);
  //     setLoading(false);
  //   }
  //   fetchDeal();
  // }, [dealId, supabase]);


  // Fetch the deal details on load
  useEffect(() => {
    async function fetchDeal() {
      const { data, error } = await supabase
        .from('deals')
        // 👇 We removed merchant_name and added profiles(business_name)
        .select('id, title, deal_price, user_id, image_url, profiles(business_name)')
        .eq('id', dealId)
        .single();
        
      if (error) {
        console.error("Checkout Fetch Error:", error.message);
        setLoading(false);
        return;
      }

      if (data) setDeal(data);
      setLoading(false);
    }
    if (dealId) fetchDeal();
  }, [dealId, supabase]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingOut(true);

    // --- TELEMETRY: LOG CHECKOUT INTENT ---
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: deal.id, eventType: 'checkout_intent' }),
    }).catch(() => {}); // Fire and forget background log

    try {
      // Hit the Escrow API route
      const res = await fetch('/api/escrow/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          amount: deal.deal_price,
          merchant_id: deal.user_id,
          buyer_email: email,
          delivery_details: { 
            email,
            phone: phone, 
            address: address 
          }
        }),
      });

      const data = await res.json();

      // if (data.authorization_url) {
      //   // Redirect buyer to the secure Paystack portal
      //   window.location.href = data.authorization_url;
      // } else {
      //   alert(data.error || 'Checkout initialization failed');
      //   setCheckingOut(false);

      // 👇 Change authorization_url to checkoutUrl
      if (data.checkoutUrl) {
        // Redirect buyer to the secure Paystack portal
        window.location.href = data.checkoutUrl;
      } else if (data.authorization_url) { 
        // Just in case we ever switch it back!
        window.location.href = data.authorization_url;
      } else {
        alert(data.error || 'Checkout initialization failed');
        setCheckingOut(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Please try again.');
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold">Loading secure checkout...</div>;
  if (!deal) return <div className="p-10 text-center font-bold text-red-500">Deal not found or expired.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 grid md:grid-cols-2 gap-10">
      
      {/* Left Column: Checkout Form */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Secure Checkout</h1>
          <p className="text-gray-500 mt-1">Your funds are protected by SlashDeals Escrow. The merchant only gets paid after you confirm delivery.</p>
        </div>

        <form onSubmit={handleCheckout} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Delivery Details</h3>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address (For Receipts & OTP)</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number (For Delivery Rider)</label>
            <input 
              type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="080..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Delivery Address</label>
            <textarea 
              required value={address} onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
              placeholder="House Number, Street, Area, City/State"
              rows={3}
            />
          </div>

          <button 
            type="submit" disabled={checkingOut}
            className="w-full mt-4 bg-black text-white font-bold py-4 px-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
          >
            {checkingOut ? 'Connecting to Paystack...' : `Pay ₦${deal.deal_price.toLocaleString()} Securely`}
            <span>🔒</span>
          </button>
        </form>
      </div>

      {/* Right Column: Order Summary */}
      <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 h-fit space-y-6">
        <h3 className="text-lg font-black text-gray-900">Order Summary</h3>
        
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xs text-gray-500">
            {deal.image_url ? (
              <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
            ) : (
              'IMG'
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 line-clamp-2">{deal.title}</h4>
          {/* //<p className="text-sm text-gray-500">Sold by {deal.merchant_name}</p> */}
            <p className="text-sm text-gray-500">Sold by {deal.profiles?.business_name || 'Verified Vendor'}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Item Price</span>
            <span>₦{deal.deal_price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>Escrow Protection Fee</span>
            <span>Free for Buyer</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
          <span className="font-bold text-gray-900">Total to Pay</span>
          <span className="text-2xl font-black text-gray-900">₦{deal.deal_price.toLocaleString()}</span>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
          <span className="text-xl">🛡️</span>
          <p>
            <strong>How Escrow Works:</strong> Your money is held securely by our Paystack vault. The merchant will not receive a single Naira until you inspect the item and give them your secret 4-digit Delivery PIN.
          </p>
        </div>
      </div>

    </div>
  );
}









// 'use client';

// import { useState, useEffect } from 'react';
// import { useParams } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';

// export default function EscrowCheckoutPage() {
//   const params = useParams();
//   const dealId = params.id as string;
//   const supabase = createClient();

//   const [deal, setDeal] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [checkingOut, setCheckingOut] = useState(false);

//   // Form State
//   const [email, setEmail] = useState('');
//   const [phone, setPhone] = useState('');
//   const [address, setAddress] = useState('');

//   // Fetch the deal details on load
//   useEffect(() => {
//     async function fetchDeal() {
//       const { data, error } = await supabase
//         .from('deals')
//         .select('id, title, deal_price, merchant_name, user_id, image_url')
//         .eq('id', dealId)
//         .single();
        
//       if (data) setDeal(data);
//       setLoading(false);
//     }
//     fetchDeal();
//   }, [dealId, supabase]);

//   const handleCheckout = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setCheckingOut(true);

//     try {
//       // Hit the Escrow API route we designed earlier
//       const res = await fetch('/api/escrow/initialize', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           deal_id: deal.id,
//           amount: deal.deal_price,
//           merchant_id: deal.user_id,
//           buyer_email: email,
//           delivery_details: { 
//             email,
//             phone: phone, 
//             address: address } // We store this in the new JSONB column!
//         }),
//       });

//       const data = await res.json();

//       if (data.authorization_url) {
//         // Redirect buyer to the secure Paystack portal
//         window.location.href = data.authorization_url;
//       } else {
//         alert(data.error || 'Checkout initialization failed');
//         setCheckingOut(false);
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Network error. Please try again.');
//       setCheckingOut(false);
//     }
//   };

//   if (loading) return <div className="p-10 text-center font-bold">Loading secure checkout...</div>;
//   if (!deal) return <div className="p-10 text-center font-bold text-red-500">Deal not found or expired.</div>;

//   return (
//     <div className="max-w-4xl mx-auto p-4 sm:p-8 grid md:grid-cols-2 gap-10">
      
//       {/* Left Column: Checkout Form */}
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-black text-gray-900">Secure Checkout</h1>
//           <p className="text-gray-500 mt-1">Your funds are protected by SlashDeals Escrow. The merchant only gets paid after you confirm delivery.</p>
//         </div>

//         <form onSubmit={handleCheckout} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
//           <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Delivery Details</h3>
          
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Email Address (For Receipts & OTP)</label>
//             <input 
//               type="email" required value={email} onChange={e => setEmail(e.target.value)}
//               className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
//               placeholder="you@email.com"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number (For Delivery Rider)</label>
//             <input 
//               type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
//               className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
//               placeholder="080..."
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Full Delivery Address</label>
//             <textarea 
//               required value={address} onChange={e => setAddress(e.target.value)}
//               className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
//               placeholder="House Number, Street, Area, City/State"
//               rows={3}
//             />
//           </div>

//           <button 
//             type="submit" disabled={checkingOut}
//             className="w-full mt-4 bg-black text-white font-bold py-4 px-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
//           >
//             {checkingOut ? 'Connecting to Paystack...' : `Pay ₦${deal.deal_price.toLocaleString()} Securely`}
//             <span>🔒</span>
//           </button>
//         </form>
//       </div>

//       {/* Right Column: Order Summary */}
//       <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 h-fit space-y-6">
//         <h3 className="text-lg font-black text-gray-900">Order Summary</h3>
        
//         <div className="flex gap-4 items-center">
//           <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xs text-gray-500">
//             {/* Replace with <img src={deal.image_url} /> if you add images */}
//             IMG
//           </div>
//           <div>
//             <h4 className="font-bold text-gray-900 line-clamp-2">{deal.title}</h4>
//             <p className="text-sm text-gray-500">Sold by {deal.merchant_name}</p>
//           </div>
//         </div>

//         <div className="border-t border-gray-200 pt-4 space-y-3">
//           <div className="flex justify-between text-sm text-gray-600">
//             <span>Item Price</span>
//             <span>₦{deal.deal_price.toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between text-sm text-green-600 font-medium">
//             <span>Escrow Protection Fee</span>
//             <span>Free for Buyer</span>
//           </div>
//         </div>

//         <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
//           <span className="font-bold text-gray-900">Total to Pay</span>
//           <span className="text-2xl font-black text-gray-900">₦{deal.deal_price.toLocaleString()}</span>
//         </div>

//         <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
//           <span className="text-xl">🛡️</span>
//           <p>
//             <strong>How Escrow Works:</strong> Your money is held securely by our Paystack vault. The merchant will not receive a single Naira until you inspect the item and give them your secret 4-digit Delivery PIN.
//           </p>
//         </div>
//       </div>

//     </div>
//   );
// }