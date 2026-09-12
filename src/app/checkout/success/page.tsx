'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState('pending_payment');
  const [orderDetails, setOrderDetails] = useState<{
    title: string;
    amount: number;
    otp: string;
    trk: string;
  } | null>(null);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }
    
    let isMounted = true;

    // async function fetchOrderDetails() {
    //   const { data, error } = await supabase
    //     .from('escrows')
    //  // .select('total_paid, status, delivery_otp, tracking_code, deals(title)')
    //     .select('total_paid, status, delivery_otp, tracking_code')
    //     .eq('id', orderId)
    //     .single();
        
    //   if (error || !data) {
    //     if (isMounted) {
    //       setOrderStatus('error');
    //       setLoading(false);
    //     }
    //     return;
    //   }
      
    //   if (isMounted) {
    //     setOrderStatus(data.status);
        
    //     // Only reveal the secure details if the Webhook has confirmed payment
    //     if (data.status !== 'pending_payment') {
    //       setOrderDetails({
    //         amount: data.total_paid,
    //     //  title: data.deals?.[0]?.title || 'SlashDeals Order',
    //         title: 'SlashDeals Order',
    //         otp: data.delivery_otp,
    //         trk: data.tracking_code,
    //       });
    //     }
    //     setLoading(false);
    //   }
    // }

 async function fetchOrderDetails() {
      // 1. We added 'id' right at the beginning of the select string 👇
      const { data, error } = await supabase
        .from('escrows')
        .select('id, total_paid, amount, status, delivery_otp, payment_reference, listing_id')
        .eq('id', orderId)
        .single();
        
      if (error || !data) {
        if (isMounted) {
          setOrderStatus('error');
          setLoading(false);
        }
        return;
      }
      
      if (isMounted) {
        setOrderStatus(data.status);
        
        if (data.status !== 'pending_payment' && data.status !== 'awaiting_payment') {
          // 2. Now data.id exists and TypeScript is happy!
          setOrderDetails({
            amount: data.total_paid || data.amount || 0,
            title: 'SlashDeals Order', 
            otp: data.delivery_otp || '----',
            trk: data.payment_reference || data.id.substring(0, 8), 
          });
        }
        setLoading(false);
      }
    }
    
    fetchOrderDetails();

    // SMART POLLING: If the webhook hasn't processed yet, check every 3 seconds
    let pollInterval: NodeJS.Timeout;
    if (orderStatus === 'pending_payment') {
      pollInterval = setInterval(fetchOrderDetails, 3000);
    }
    
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId, orderStatus, router, supabase]);

  const handleDownload = () => {
    window.print();
  };

  // 1. Loading State
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold">Connecting to Secure Vault...</div>;
  }

  // 2. Waiting for Webhook State (Race Condition Protection)
  if (orderStatus === 'pending_payment') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment...</h2>
        <p className="text-gray-500 font-medium max-w-sm">
          Awaiting confirmation from the payment provider. Please do not close this page, your receipt will appear momentarily.
        </p>
      </div>
    );
  }

  // 3. Error State
  if (orderStatus === 'error' || !orderDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">We could not locate this transaction.</p>
        <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-bold">Return Home</Link>
      </div>
    );
  }

  // 4. Success State (The Receipt)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 print:bg-white print:p-0">
      
      <div className="max-w-md w-full space-y-6">
        
        {/* THE RECEIPT CARD */}
        <div id="receipt-card" className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg print:shadow-none print:border-none print:m-0">
          
          <div className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
              ✅
            </div>
            <h1 className="text-2xl font-black text-gray-900">Payment Successful</h1>
            <p className="text-gray-500 font-medium">Your funds are safely locked in Escrow.</p>
          </div>

          <div className="border-t-2 border-dashed border-gray-200 py-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Item</span>
              <span className="font-bold text-gray-900 text-sm text-right max-w-[60%] truncate">{orderDetails.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Amount Paid</span>
              <span className="font-black text-gray-900">₦{orderDetails.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Date</span>
              <span className="font-bold text-gray-900 text-sm">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center space-y-4 print:bg-white print:border-gray-300">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Delivery PIN (OTP)</p>
              <p className="text-5xl font-black text-blue-900 tracking-[0.2em]">{orderDetails.otp}</p>
            </div>
            
            <div className="w-full h-px bg-blue-200 print:bg-gray-200 my-2"></div>
            
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Secret Tracking Code</p>
              <p className="text-xl font-black text-gray-900">{orderDetails.trk}</p>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500 mt-6 font-medium">
            ⚠️ <strong>Do not</strong> give the PIN to the vendor until you have received and inspected your item. If you lose this receipt, go to <span className="text-black font-bold">slashdeals.com.ng/track</span> and enter your Tracking Code.
          </p>
        </div>

        {/* WEB-ONLY ACTIONS */}
        <div className="space-y-3 print:hidden">
          <button 
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md text-lg"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download Receipt (PDF)
          </button>
          
          <Link href="/" className="block w-full text-center bg-white border-2 border-gray-200 text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-50 transition-colors">
            Return to Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold">Loading Secure Vault...</div>}>
      <SuccessContent />
    </Suspense>
  );
}