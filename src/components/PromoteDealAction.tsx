// components/PromoteDealAction.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  dealId: string;
  dealTitle: string;
  currentBalance: number;
}

export default function PromoteDealAction({ dealId, dealTitle, currentBalance }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyBump = async (tier: 'flash_1h' | 'spotlight_24h') => {
    const cost = tier === 'flash_1h' ? 200 : 500;
    
    if (currentBalance < cost) {
      alert(`Insufficient funds. You need ₦${cost} in your wallet.`);
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/bump/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, tier }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setIsOpen(false);
        // This forces the Server Component to re-fetch the wallet balance & deals!
        router.refresh(); 
      } else {
        alert(data.error || 'Promotion failed');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
    
    setIsProcessing(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white font-bold px-3 py-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1"
      >
        <span>🚀</span> Promote
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">✖</button>
            
            <h2 className="text-2xl font-black text-gray-900 mb-1">Boost Your Sales</h2>
            <p className="text-gray-500 text-sm font-medium mb-4 line-clamp-1">"{dealTitle}"</p>

            <div className="space-y-4">
              <button 
                onClick={() => handleApplyBump('flash_1h')}
                disabled={isProcessing}
                className="w-full text-left bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 p-4 rounded-2xl transition-all group disabled:opacity-50"
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 flex items-center gap-2">
                    ⚡ Flash Bump
                  </h3>
                  <span className="font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">₦200</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Shoots your deal to the #1 spot on the main feed and your local city page.</p>
              </button>

              <button 
                onClick={() => handleApplyBump('spotlight_24h')}
                disabled={isProcessing}
                className="w-full text-left bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 p-4 rounded-2xl transition-all group disabled:opacity-50"
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-gray-900 group-hover:text-amber-700 flex items-center gap-2">
                    ⭐ 24-Hr Spotlight
                  </h3>
                  <span className="font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-lg">₦500</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Pins your deal in the premium gold carousel at the very top of the homepage for a full day.</p>
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs font-bold text-gray-400">Current Balance: ₦{currentBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}