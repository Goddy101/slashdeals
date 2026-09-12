// app/admin/withdrawals/ApproveButton.tsx
'use client';

import { useState } from 'react';
import { approveWithdrawalAction } from './actions';

interface Props {
  transactionId: string;
  amount: number;
  merchantName: string;
}

export function ApproveButton({ transactionId, amount, merchantName }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (formData: FormData) => {
    if (!window.confirm(`Transfer ₦${amount.toLocaleString()} to ${merchantName}?`)) return;
    
    setIsProcessing(true);
    
    try {
      const res = await approveWithdrawalAction(formData);
      
      if (res.success) {
        alert(`✅ Transfer successful! Funds sent to ${merchantName}.`);
      }
    } catch (err: any) {
      // Show the actual error thrown from the Server Action (e.g., Paystack failure)
      alert(`❌ Error: ${err.message || 'Transfer failed. Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form action={handleApprove}>
      <input type="hidden" name="transactionId" value={transactionId} />
      <button 
        type="submit" 
        disabled={isProcessing}
        className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md min-w-[140px] flex justify-center items-center gap-2"
      >
        {isProcessing ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          <>Approve & Send 💸</>
        )}
      </button>
    </form>
  );
}