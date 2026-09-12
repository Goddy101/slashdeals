// components/EscrowCheckoutModal.tsx
'use client';

import { useState } from 'react';

interface CheckoutProps {
  listing: {
    id: string;
    title: string;
    price: number;
    sellerId: string;
  };
  currentUser: {
    id: string;
    email: string;
  };
}

export default function EscrowCheckoutModal({ listing, currentUser }: CheckoutProps) {
  const [gateway, setGateway] = useState<'paystack' | 'bachs'>('paystack');
  const [loading, setLoading] = useState(false);

  const escrowFee = listing.price * 0.025;
  const total = listing.price + escrowFee;

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escrow/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerId: currentUser.id,
          sellerId: listing.sellerId,
          amount: listing.price,
          gateway,
          email: currentUser.email,
        }),
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Payment initialization failed.');
      }
    } catch (e) {
      alert('Network error initializing escrow vault.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg mx-auto text-white shadow-2xl">
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full w-fit mb-4">
        <span>🛡️ 48-Hour Escrow Protection</span>
      </div>

      <h3 className="text-2xl font-black mb-1">Fund Escrow Vault</h3>
      <p className="text-sm text-zinc-400 mb-6">Funds are held safely until you verify the asset handover.</p>

      {/* Summary Breakdown */}
      <div className="bg-zinc-950/80 rounded-2xl p-4 border border-zinc-800/80 space-y-2 mb-6 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>Asset Value:</span>
          <span className="font-semibold text-white">₦{listing.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Escrow Protection Fee (2.5%):</span>
          <span className="font-semibold text-white">₦{escrowFee.toLocaleString()}</span>
        </div>
        <div className="pt-2 border-t border-zinc-800 flex justify-between text-base font-bold text-white">
          <span>Total Deposit:</span>
          <span className="text-emerald-400">₦{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Gateway Selector */}
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
        Select Payment Method
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Option 1: Paystack */}
        <button
          type="button"
          onClick={() => setGateway('paystack')}
          className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
            gateway === 'paystack'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg'
              : 'border-zinc-800 bg-zinc-950/40 opacity-70 hover:opacity-100'
          }`}
        >
          <span className="font-bold text-sm">Paystack</span>
          <span className="text-xs text-zinc-400 mt-1">Bank Transfer, NGN Cards, USSD</span>
        </button>

        {/* Option 2: Bachs */}
        <button
          type="button"
          onClick={() => setGateway('bachs')}
          className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
            gateway === 'bachs'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg'
              : 'border-zinc-800 bg-zinc-950/40 opacity-70 hover:opacity-100'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Bachs.io</span>
            <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800 px-1.5 py-0.5 rounded">USDT/USDC</span>
          </div>
          <span className="text-xs text-zinc-400 mt-1">Crypto Stablecoins, Global Cards</span>
        </button>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black py-4 rounded-2xl transition-all shadow-xl"
      >
        {loading ? 'Opening Vault...' : `Lock ₦${total.toLocaleString()} in Escrow`}
      </button>
    </div>
  );
}