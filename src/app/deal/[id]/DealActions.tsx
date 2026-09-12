'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DealActions({ dealId, initialUpvotes, dealTitle, dealPrice }: { dealId: string, initialUpvotes: number, dealTitle: string, dealPrice: number }) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [upvoting, setUpvoting] = useState(false);

  const handleUpvote = async () => {
    setUpvoting(true);
    const dummyIpHash = 'user-session-' + Math.random().toString(36).substring(7);
    const { data } = await supabase.rpc('toggle_deal_upvote', { p_deal_id: dealId, p_ip_hash: dummyIpHash });
    if (data === true) setUpvotes(upvotes + 1);
    setUpvoting(false);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://slashdeals.com.ng/deal/${dealId}`;
  const whatsappText = encodeURIComponent(`Craziest price slash! ${dealTitle} for just ₦${dealPrice.toLocaleString()} on SlashDeals. Check it out: ${shareUrl}`);

  return (
    <div className="flex gap-4 pt-2">
      <button 
        onClick={handleUpvote} disabled={upvoting}
        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>👍</span> {upvotes} {upvoting ? '...' : 'Upvote'}
      </button>
      
      <a 
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold shadow-sm hover:bg-[#20bd5a] transition-colors"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.397 0 .015 5.38.015 12.012c0 2.122.553 4.19 1.603 6.014L.197 24l6.126-1.605a11.96 11.96 0 005.708 1.442h.004c6.632 0 12.013-5.38 12.013-12.012C24.048 5.38 18.666 0 12.031 0z"/></svg>
        Share
      </a>
    </div>
  );
}