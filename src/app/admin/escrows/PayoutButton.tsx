// app/admin/escrows/PayoutButton.tsx
'use client';

import { useState } from 'react';
import { releasePayoutAction } from './actions';

export function PayoutButton({ escrowId }: { escrowId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayout = async (formData: FormData) => {
    if (!window.confirm('Are you sure? This will release the escrowed funds directly into the merchant\'s wallet.')) return;
    
    setIsProcessing(true);
    
    // Call the server action
    const res = await releasePayoutAction(formData) as unknown as {
      error?: string;
      success?: boolean;
      netPayout?: number;
    };
    
    setIsProcessing(false);

    if (res?.error) {
      alert(`❌ Payout Failed: ${res.error}`);
    } else if (res?.success) {
      const netPayout = res.netPayout;
      alert(`✅ Payout successful! ₦${netPayout?.toLocaleString()} has been credited to the merchant's wallet.`);
    }
  };

  return (
    <form action={handlePayout}>
      <input type="hidden" name="escrowId" value={escrowId} />
      <button 
        type="submit" 
        disabled={isProcessing}
        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-lg min-w-[120px]"
      >
        {isProcessing ? 'Releasing...' : 'Release to Wallet'}
      </button>
    </form>
  );
}