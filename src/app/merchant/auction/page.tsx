'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdAuctionArena() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  
  // Data State
  const [walletBalance, setWalletBalance] = useState(0);
  const [myDeals, setMyDeals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Form State
  const [selectedDeal, setSelectedDeal] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Calculate Tomorrow's Date (The target for the auction)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDateString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // THE BUG FIX: Redirect instead of failing silently
    if (!user) {
      router.push('/login');
      return;
    }

    // 1. Get Wallet Balance
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
    if (profile) setWalletBalance(profile.wallet_balance);

    // 2. Get Merchant's Active Deals
    const { data: deals } = await supabase.from('deals').select('id, title').eq('user_id', user.id);
    if (deals) setMyDeals(deals);

    // 3. Get Live Leaderboard for Tomorrow (Top 5 Bids)
    const { data: topBids } = await supabase
      .from('bids')
      .select('amount, deals(title)')
      .eq('target_date', targetDateString)
      .order('amount', { ascending: false })
      .limit(5);
    
    if (topBids) setLeaderboard(topBids);
    setLoading(false);
  }

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingBid(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const res = await fetch('/api/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: user?.id,
          deal_id: selectedDeal,
          bid_amount: Number(bidAmount),
          target_date: targetDateString
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: 'Bid placed successfully! Funds locked.', type: 'success' });
        setBidAmount('');
        fetchDashboardData(); // Refresh leaderboard and wallet
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Try again.', type: 'error' });
    }
    setPlacingBid(false);
  };

  if (loading) return <div className="p-10 font-bold text-center">Loading the Arena...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
      
      {/* Header & Wallet Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black text-white p-6 sm:p-8 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <span>🔥</span> The Ad Arena
          </h1>
          <p className="text-gray-400 mt-1">Bid for the Top 5 slots on tomorrow's homepage.</p>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 text-right">
          <p className="text-sm text-gray-300 font-bold uppercase tracking-wider">Available Wallet Funds</p>
          <p className="text-3xl font-black text-green-400">₦{walletBalance.toLocaleString()}</p>
          {walletBalance < 1000 && (
            <a href="/merchant/wallet" className="text-xs text-yellow-400 underline mt-1 block">Top up to bid</a>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Left: The Leaderboard */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex justify-between items-center">
              Live Leaderboard
              <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                Ends at Midnight
              </span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">Target Date: {new Date(targetDateString).toLocaleDateString()}</p>
          </div>

          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-xl text-gray-500 border border-gray-100 font-medium">
                No bids yet for tomorrow. Secure the #1 spot for cheap!
              </div>
            ) : (
              leaderboard.map((bid, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${
                  index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'
                    }`}>
                      #{index + 1}
                    </div>
                    <p className="font-bold text-gray-900 line-clamp-1 text-sm">{bid.deals?.title || 'Hidden Deal'}</p>
                  </div>
                  <div className="font-black text-gray-900">
                    ₦{bid.amount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: The Bidding Form */}
        <div className="bg-gray-50 p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm h-fit">
          <h3 className="text-xl font-black text-gray-900 mb-6">Place Your Bid</h3>
          
          <form onSubmit={handlePlaceBid} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Select Deal to Promote</label>
              <select 
                required 
                value={selectedDeal} 
                onChange={e => setSelectedDeal(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
              >
                <option value="" disabled>-- Select a deal --</option>
                {myDeals.map(deal => (
                  <option key={deal.id} value={deal.id}>{deal.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                <span>Bid Amount (₦)</span>
                {/* Changed this to match our strategic ₦1,000 baseline */}
                <span className="text-gray-400 font-normal">Min: ₦1,000</span> 
              </label>
              <input 
                type="number" 
                required 
                min="1000" /* Ensure this matches your API logic */
                step="500"
                value={bidAmount} 
                onChange={e => setBidAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none text-xl font-black bg-white"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-bold ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={placingBid || walletBalance < 1000} /* Updated threshold */
              className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 text-lg shadow-md"
            >
              {placingBid ? 'Locking Funds...' : 'Submit Bid & Lock Funds'}
            </button>
            <p className="text-xs text-center text-gray-500 font-medium">
              If you lose the auction, your funds are instantly unlocked and returned to your available wallet balance at midnight.
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}