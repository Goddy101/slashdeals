'use client';

import { useState } from 'react';

interface BumpModalProps {
  dealId: string;
  dealTitle: string;
  walletBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export function BumpModal({ dealId, dealTitle, walletBalance, isOpen, onClose, onSuccess }: BumpModalProps) {
  const [selectedTier, setSelectedTier] = useState<'flash_1h' | 'spotlight_24h'>('flash_1h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cost = selectedTier === 'flash_1h' ? 200 : 500;
  const hasEnoughFunds = walletBalance >= cost;

  async function handleBump() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/deals/bump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, tier: selectedTier }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to bump deal');

      onSuccess(data.newBalance);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-white shadow-2xl">
        <h2 className="text-xl font-black">🚀 Boost Listing Visibility</h2>
        <p className="mt-1 text-sm text-zinc-400 truncate">{dealTitle}</p>

        <div className="mt-5 space-y-3">
          {/* 1-Hour Flash Option */}
          <div
            onClick={() => setSelectedTier('flash_1h')}
            className={`cursor-pointer rounded-xl p-4 border transition-all ${
              selectedTier === 'flash_1h'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">⚡ 1-Hour Flash Bump</p>
                <p className="text-xs text-zinc-400">Jumps straight to #1 on homepage feed</p>
              </div>
              <span className="text-lg font-black text-emerald-400">₦200</span>
            </div>
          </div>

          {/* 24-Hour Spotlight Option */}
          <div
            onClick={() => setSelectedTier('spotlight_24h')}
            className={`cursor-pointer rounded-xl p-4 border transition-all ${
              selectedTier === 'spotlight_24h'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">⭐ 24-Hour Spotlight</p>
                <p className="text-xs text-zinc-400">Pinned in top featured carousel all day</p>
              </div>
              <span className="text-lg font-black text-amber-400">₦500</span>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className="mt-4 flex justify-between text-xs text-zinc-400 px-1">
          <span>Wallet Balance: ₦{walletBalance.toLocaleString()}</span>
          {!hasEnoughFunds && <span className="text-red-400 font-semibold">Insufficient Balance</span>}
        </div>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-zinc-800 text-sm font-semibold hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            disabled={!hasEnoughFunds || loading}
            onClick={handleBump}
            className="w-2/3 py-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `Pay ₦${cost} & Bump`}
          </button>
        </div>
      </div>
    </div>
  );
}