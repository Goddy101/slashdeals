'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MerchantOrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // State for handling OTP inputs for specific orders
  const [otps, setOtps] = useState<{ [key: string]: string }>({});
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [messages, setMessages] = useState<{ [key: string]: { text: string, type: 'error' | 'success' } }>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // THE BUG FIX: Redirect instead of failing silently
    if (!user) {
      router.push('/login');
      return;
    }
    
    setUserId(user.id);

    // Fetch orders belonging to this merchant, newest first
    const { data } = await supabase
      .from('escrows')
      .select(`
        id, 
        status, 
        total_paid, 
        escrow_fee, 
        created_at, 
        delivery_details,
        deals (title, image_url)
      `)
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  }

  const handleOtpChange = (orderId: string, value: string) => {
    // Only allow numbers, max 4 digits
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setOtps(prev => ({ ...prev, [orderId]: cleaned }));
  };

  const submitOtp = async (orderId: string) => {
    const otp = otps[orderId];
    if (!otp || otp.length !== 4) {
      setMessages(prev => ({ ...prev, [orderId]: { text: 'PIN must be 4 digits.', type: 'error' } }));
      return;
    }

    setProcessing(prev => ({ ...prev, [orderId]: true }));
    setMessages(prev => ({ ...prev, [orderId]: null as any }));

    try {
      //const res = await fetch('/api/escrow/redeem', {
      const res = await fetch('/api/escrow/verify-otp', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, merchant_id: userId, otp }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => ({ ...prev, [orderId]: { text: `Success! ₦${data.payoutAmount.toLocaleString()} added to your wallet.`, type: 'success' } }));
        // Refresh orders to show this one as completed
        setTimeout(() => fetchOrders(), 2000);
      } else {
        setMessages(prev => ({ ...prev, [orderId]: { text: data.error, type: 'error' } }));
      }
    } catch (err) {
      setMessages(prev => ({ ...prev, [orderId]: { text: 'Network error.', type: 'error' } }));
    }

    setProcessing(prev => ({ ...prev, [orderId]: false }));
  };

  if (loading) return <div className="p-10 font-bold text-center">Loading your orders...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      
      <div>
        <h1 className="text-3xl font-black text-gray-900">Manage Orders</h1>
        <p className="text-gray-500 mt-1">Deliver items, enter the buyer's secret PIN, and unlock your money instantly.</p>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-gray-200 text-center space-y-3">
            <span className="text-4xl">📦</span>
            <h3 className="font-bold text-gray-900 text-lg">No orders yet</h3>
            <p className="text-gray-500">When buyers pay into Escrow, their orders will appear here.</p>
          </div>
        ) : (
          orders.map((order) => {
            const payoutAmount = order.total_paid - order.escrow_fee;
            
            // Determine if this was a digital/service order
            const isDigital = order.delivery_details?.type === 'digital_or_service';

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                
                {/* Left: Order Info */}
                <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.status === 'completed' ? 'Delivered & Paid' : 'Awaiting Fulfillment'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400 font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{order.deals?.title}</h3>
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2 text-sm border border-gray-100">
                      <p><span className="font-bold text-gray-700">Buyer Details:</span></p>
                      <p className="text-gray-600">📞 {order.delivery_details?.phone || 'No phone provided'}</p>
                      
                      {/* Dynamically show physical address or digital instructions */}
                      {isDigital ? (
                        <p className="text-gray-600">📝 <span className="font-bold text-gray-800">Instructions:</span> {order.delivery_details?.instructions || 'No instructions provided.'}</p>
                      ) : (
                        <p className="text-gray-600">📍 {order.delivery_details?.address || 'No address provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: The Money & OTP Action */}
                <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center space-y-4">
                  
                  <div className="space-y-1">
                    <p className="flex justify-between text-sm text-gray-500 font-medium">
                      <span>Buyer Paid</span>
                      <span>₦{order.total_paid.toLocaleString()}</span>
                    </p>
                    <p className="flex justify-between text-sm text-red-400 font-medium border-b border-gray-200 pb-2">
                      <span>Platform Fee (2.5%)</span>
                      <span>-₦{order.escrow_fee.toLocaleString()}</span>
                    </p>
                    <p className="flex justify-between text-lg font-black text-gray-900 pt-1">
                      <span>Your Payout</span>
                      <span className="text-green-600">₦{payoutAmount.toLocaleString()}</span>
                    </p>
                  </div>

                  {order.status === 'completed' ? (
                    <div className="bg-green-100 text-green-700 font-bold p-4 rounded-xl text-center flex items-center justify-center gap-2">
                      <span>✅</span> Funds in Wallet
                    </div>
                  ) : (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <label className="block text-sm font-bold text-gray-700 text-center">
                        Enter Buyer's 4-Digit PIN
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="0000"
                          value={otps[order.id] || ''}
                          onChange={(e) => handleOtpChange(order.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-black outline-none font-black text-center text-xl tracking-[0.3em]"
                          maxLength={4}
                        />
                        <button 
                          onClick={() => submitOtp(order.id)}
                          disabled={processing[order.id] || (otps[order.id]?.length !== 4)}
                          className="bg-black text-white font-bold px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {processing[order.id] ? '...' : 'Unlock'}
                        </button>
                      </div>
                      {messages[order.id] && (
                        <p className={`text-xs font-bold text-center ${messages[order.id].type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                          {messages[order.id].text}
                        </p>
                      )}
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}






// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';

// export default function MerchantOrdersPage() {
//   const router = useRouter();
//   const supabase = createClient();
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [orders, setOrders] = useState<any[]>([]);
  
//   // State for handling OTP inputs for specific orders
//   const [otps, setOtps] = useState<{ [key: string]: string }>({});
//   const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
//   const [messages, setMessages] = useState<{ [key: string]: { text: string, type: 'error' | 'success' } }>({});

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   async function fetchOrders() {
//     const { data: { user } } = await supabase.auth.getUser();
    
//     // THE BUG FIX: Redirect instead of failing silently
//     if (!user) {
//       router.push('/login');
//       return;
//     }
    
//     setUserId(user.id);

//     // Fetch orders belonging to this merchant, newest first
//     const { data } = await supabase
//       .from('escrows')
//       .select(`
//         id, 
//         status, 
//         total_paid, 
//         escrow_fee, 
//         created_at, 
//         delivery_details,
//         deals (title, image_url)
//       `)
//       .eq('merchant_id', user.id)
//       .order('created_at', { ascending: false });

//     if (data) setOrders(data);
//     setLoading(false);
//   }

//   const handleOtpChange = (orderId: string, value: string) => {
//     // Only allow numbers, max 4 digits
//     const cleaned = value.replace(/\D/g, '').slice(0, 4);
//     setOtps(prev => ({ ...prev, [orderId]: cleaned }));
//   };

//   const submitOtp = async (orderId: string) => {
//     const otp = otps[orderId];
//     if (!otp || otp.length !== 4) {
//       setMessages(prev => ({ ...prev, [orderId]: { text: 'PIN must be 4 digits.', type: 'error' } }));
//       return;
//     }

//     setProcessing(prev => ({ ...prev, [orderId]: true }));
//     setMessages(prev => ({ ...prev, [orderId]: null as any }));

//     try {
//       const res = await fetch('/api/escrow/redeem', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ order_id: orderId, merchant_id: userId, otp }),
//       });

//       const data = await res.json();

//       if (data.success) {
//         setMessages(prev => ({ ...prev, [orderId]: { text: `Success! ₦${data.payoutAmount.toLocaleString()} added to your wallet.`, type: 'success' } }));
//         // Refresh orders to show this one as completed
//         setTimeout(() => fetchOrders(), 2000);
//       } else {
//         setMessages(prev => ({ ...prev, [orderId]: { text: data.error, type: 'error' } }));
//       }
//     } catch (err) {
//       setMessages(prev => ({ ...prev, [orderId]: { text: 'Network error.', type: 'error' } }));
//     }

//     setProcessing(prev => ({ ...prev, [orderId]: false }));
//   };

//   if (loading) return <div className="p-10 font-bold text-center">Loading your orders...</div>;

//   return (
//     <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      
//       <div>
//         <h1 className="text-3xl font-black text-gray-900">Manage Orders</h1>
//         <p className="text-gray-500 mt-1">Deliver items, enter the buyer's secret PIN, and unlock your money instantly.</p>
//       </div>

//       <div className="space-y-6">
//         {orders.length === 0 ? (
//           <div className="bg-white p-10 rounded-3xl border border-gray-200 text-center space-y-3">
//             <span className="text-4xl">📦</span>
//             <h3 className="font-bold text-gray-900 text-lg">No orders yet</h3>
//             <p className="text-gray-500">When buyers pay into Escrow, their orders will appear here.</p>
//           </div>
//         ) : (
//           orders.map((order) => {
//             const payoutAmount = order.total_paid - order.escrow_fee;
            
//             // Determine if this was a digital/service order
//             const isDigital = order.delivery_details?.type === 'digital_or_service';

//             return (
//               <div key={order.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                
//                 {/* Left: Order Info */}
//                 <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-between">
//                   <div>
//                     <div className="flex justify-between items-start mb-4">
//                       <div className="flex items-center gap-2">
//                         <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
//                           order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
//                         }`}>
//                           {order.status === 'completed' ? 'Delivered & Paid' : 'Awaiting Fulfillment'}
//                         </span>
//                       </div>
//                       <span className="text-sm text-gray-400 font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
//                     </div>

//                     <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{order.deals?.title}</h3>
                    
//                     <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2 text-sm border border-gray-100">
//                       <p><span className="font-bold text-gray-700">Buyer Details:</span></p>
//                       <p className="text-gray-600">📞 {order.delivery_details?.phone || 'No phone provided'}</p>
                      
//                       {/* Dynamically show physical address or digital instructions */}
//                       {isDigital ? (
//                         <p className="text-gray-600">📝 <span className="font-bold text-gray-800">Instructions:</span> {order.delivery_details?.instructions || 'No instructions provided.'}</p>
//                       ) : (
//                         <p className="text-gray-600">📍 {order.delivery_details?.address || 'No address provided'}</p>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Right: The Money & OTP Action */}
//                 <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center space-y-4">
                  
//                   <div className="space-y-1">
//                     <p className="flex justify-between text-sm text-gray-500 font-medium">
//                       <span>Buyer Paid</span>
//                       <span>₦{order.total_paid.toLocaleString()}</span>
//                     </p>
//                     <p className="flex justify-between text-sm text-red-400 font-medium border-b border-gray-200 pb-2">
//                       <span>Platform Fee (2.5%)</span>
//                       <span>-₦{order.escrow_fee.toLocaleString()}</span>
//                     </p>
//                     <p className="flex justify-between text-lg font-black text-gray-900 pt-1">
//                       <span>Your Payout</span>
//                       <span className="text-green-600">₦{payoutAmount.toLocaleString()}</span>
//                     </p>
//                   </div>

//                   {order.status === 'completed' ? (
//                     <div className="bg-green-100 text-green-700 font-bold p-4 rounded-xl text-center flex items-center justify-center gap-2">
//                       <span>✅</span> Funds in Wallet
//                     </div>
//                   ) : (
//                     <div className="space-y-3 pt-4 border-t border-gray-200">
//                       <label className="block text-sm font-bold text-gray-700 text-center">
//                         Enter Buyer's 4-Digit PIN
//                       </label>
//                       <div className="flex gap-2">
//                         <input 
//                           type="text" 
//                           placeholder="0000"
//                           value={otps[order.id] || ''}
//                           onChange={(e) => handleOtpChange(order.id, e.target.value)}
//                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-black outline-none font-black text-center text-xl tracking-[0.3em]"
//                           maxLength={4}
//                         />
//                         <button 
//                           onClick={() => submitOtp(order.id)}
//                           disabled={processing[order.id] || (otps[order.id]?.length !== 4)}
//                           className="bg-black text-white font-bold px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
//                         >
//                           {processing[order.id] ? '...' : 'Unlock'}
//                         </button>
//                       </div>
//                       {messages[order.id] && (
//                         <p className={`text-xs font-bold text-center ${messages[order.id].type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
//                           {messages[order.id].text}
//                         </p>
//                       )}
//                     </div>
//                   )}

//                 </div>

//               </div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// // 