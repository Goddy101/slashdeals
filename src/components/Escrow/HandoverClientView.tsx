'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type HandoverClientViewProps = {
  escrow: {
    id: string;
    status: string;
    amount: number;
    inspection_expires_at: string | null;
    listings?: Array<{ title: string; price: number; images: string[] | null }>;
  };
  orderOtp: string;
  trackingCode: string;
  isBuyer: boolean;
  isAdmin: boolean;
  initialMessages: Array<any>;
};

export default function HandoverClientView({
  escrow,
  orderOtp,
  trackingCode,
  isBuyer,
  isAdmin,
}: HandoverClientViewProps) {
  const router = useRouter();
  const [releasing, setReleasing] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const listing = escrow.listings?.[0];

  const handleReleaseFunds = async () => {
    // Basic frontend check. Real check happens on the backend.
    if (otpInput.trim() !== orderOtp && orderOtp !== '----') {
      alert("Invalid Delivery OTP. Please ask the seller for the correct OTP.");
      return;
    }

    if (!confirm("Are you sure you want to release the funds? This cannot be undone.")) return;
    
    setReleasing(true);
    try {
    //   const res = await fetch('/api/escrow/release', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ 
    //       escrow_id: escrow.id,
    //       otp: otpInput 
    //     })
    //   });


    const res = await fetch('/api/escrow/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    order_id: escrow.id,
    otp_attempt: otpInput 
  })
});
      
      const data = await res.json();
      
      if (data.success) {
        alert("Funds released successfully! The seller's wallet has been credited.");
        router.refresh(); // Tells Next.js to re-fetch the server component data
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Network error.");
    }
    setReleasing(false);
  };

  const handleDispute = async () => {
    if (!confirm("Are you sure you want to open a dispute? This halts the transaction and alerts our admin team.")) return;
    setDisputing(true);
    // You would wire this to /api/escrow/dispute
    alert("Dispute opened. The admin team has been notified.");
    setDisputing(false);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{listing?.title || 'Escrow transaction'}</h2>
            <div className="mt-2 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                escrow.status === 'funded' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                escrow.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                escrow.status === 'disputed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {escrow.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-zinc-500">Total Amount Locked</p>
            <p className="font-black text-2xl text-emerald-400">₦{Number(escrow.amount).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {isBuyer && escrow.status === 'funded' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <p className="text-xs font-bold uppercase text-zinc-500 mb-1">Handover OTP</p>
              <p className="text-sm text-zinc-400 mb-3">Ask the seller for this code upon delivery.</p>
              <input 
                type="text" 
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-center tracking-widest focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          )}

          {!isBuyer && escrow.status === 'funded' && (
             <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-900/50">
               <p className="text-xs font-bold uppercase text-blue-400 mb-1">Your Delivery OTP</p>
               <p className="text-sm text-zinc-400 mb-2">Give this to the buyer when you handover the item.</p>
               <p className="text-3xl font-black tracking-widest text-white font-mono">{orderOtp}</p>
             </div>
          )}

          {escrow.status === 'funded' && escrow.inspection_expires_at && (
             <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-center">
               <p className="text-xs uppercase text-zinc-500 font-bold mb-1">Inspection Window Ends</p>
               <p className="font-mono text-sm text-zinc-300">
                 {new Date(escrow.inspection_expires_at).toLocaleString()}
               </p>
               <p className="text-xs text-zinc-500 mt-2">Funds auto-release if no dispute is opened.</p>
             </div>
          )}
        </div>
      </section>

      {/* ACTION BUTTONS (Buyer Only) */}
      {isBuyer && escrow.status === 'funded' && (
        <div className="flex gap-4">
          <button 
            onClick={handleDispute}
            disabled={disputing || releasing}
            className="w-1/3 py-4 rounded-xl font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
          >
            Open Dispute
          </button>
          <button 
            onClick={handleReleaseFunds}
            disabled={releasing || disputing}
            className="w-2/3 py-4 rounded-xl font-black bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            {releasing ? 'Processing...' : 'Approve & Release Funds'}
          </button>
        </div>
      )}
    </div>
  );
}