'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MerchantWalletPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Data State
  const [walletBalance, setWalletBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  const banks = [
    { name: 'GTBank', code: '058' },
    { name: 'Access Bank', code: '044' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'Opay', code: '999992' },
    { name: 'Moniepoint', code: '090405' }
  ];

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('GTBank');
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [bankCode, setBankCode] = useState(banks[0]?.code ?? '058');

  // ⚡ Top-Up State
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  // async function fetchWalletData() {
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (!user) return;
  //   setUserId(user.id);

  //   const { data: profile } = await supabase
  //     .from('profiles')
  //     .select('wallet_balance, locked_balance')
  //     .eq('id', user.id)
  //     .single();

  //   if (profile) {
  //     setWalletBalance(profile.wallet_balance || 0);
  //     setLockedBalance(profile.locked_balance || 0);
  //   }

  //   const { data: txs } = await supabase
  //     .from('wallet_transactions')
  //     .select('*')
  //     .eq('merchant_id', user.id)
  //     .order('created_at', { ascending: false })
  //     .limit(20);

  //   if (txs) setTransactions(txs);
  //   setLoading(false);
  // }


  async function fetchWalletData() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("No active session found.");
        // Optional: Redirect them to login if they somehow got here logged out
        window.location.href = '/login'; 
        return;
      }
      
      setUserId(user.id);

      // Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance, locked_balance')
        .eq('id', user.id)
        .single();

      if (profileError) console.error("Profile Error:", profileError);
      
      if (profile) {
        setWalletBalance(profile.wallet_balance || 0);
        setLockedBalance(profile.locked_balance || 0);
      }

      // Fetch Transactions
      const { data: txs, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) console.error("TX Error:", txError);
      
      if (txs) setTransactions(txs);

    } catch (err) {
      console.error("Unexpected error loading wallet:", err);
    } finally {
      // 🚀 THIS IS THE MAGIC FIX: Always dismiss the loading screen no matter what!
      setLoading(false);
    }
  }

  // ⚡ Top-Up Handler
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsToppingUp(true);

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(topUpAmount) }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.error || 'Failed to initialize deposit.');
        setIsToppingUp(false);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      setIsToppingUp(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    setMessage(null);

    const amount = Number(withdrawAmount);

    if (amount > walletBalance) {
      setMessage({ text: 'You cannot withdraw more than your available balance.', type: 'error' });
      setRequesting(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: userId,
          amount,
          bank_name: bankName,
          account_number: accountNumber
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: 'Withdrawal request submitted successfully! Funds will arrive within 2-4 hours.', type: 'success' });
        setWithdrawAmount('');
        setAccountNumber('');
        fetchWalletData(); 
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    }
    setRequesting(false);
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'deposit') return <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">↓ 💳</span>;
    if (type === 'digital_asset_purchase') return <span className="bg-fuchsia-100 text-fuchsia-600 p-2 rounded-lg">↑ 📸</span>;
    if (type === 'escrow_payment') return <span className="bg-green-100 text-green-600 p-2 rounded-lg">↓ 🛡️</span>;
    if (type === 'bid_lock') return <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">🔒 🔥</span>;
    if (type === 'bid_unlock') return <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">🔓 ↩️</span>;
    if (type === 'bid_won_deduction') return <span className="bg-red-100 text-red-600 p-2 rounded-lg">↑ 🏆</span>;
    if (type === 'withdrawal') {
      return status === 'pending' 
        ? <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">⏳ 🏦</span>
        : <span className="bg-gray-100 text-gray-600 p-2 rounded-lg">↑ 🏦</span>;
    }
    return <span className="bg-gray-100 text-gray-600 p-2 rounded-lg">⚙️</span>;
  };

  const getTransactionTitle = (type: string) => {
    const titles: Record<string, string> = {
      deposit: 'Wallet Top-Up',
      digital_asset_purchase: 'Digital Asset Download',
      escrow_payment: 'Escrow Payout Received',
      bid_lock: 'Funds Locked for Auction Bid',
      bid_unlock: 'Auction Lost (Funds Returned)',
      bid_won_deduction: 'Ad Payment (Spotlight/Bump)',
      withdrawal: 'Bank Withdrawal'
    };
    return titles[type] || 'Wallet Transaction';
  };

  if (loading) return <div className="p-10 font-bold">Loading Wallet...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 relative">
      
      {/* 1. Balances Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-black text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-sm mb-1">Available Balance</p>
              <h1 className="text-4xl sm:text-5xl font-black text-green-400">₦{walletBalance.toLocaleString()}</h1>
            </div>
            {/* ⚡ Top Up Button added to the card */}
            <button 
              onClick={() => setShowTopUp(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors backdrop-blur-sm"
            >
              + Deposit
            </button>
          </div>
          <div className="relative z-10">
            <p className="text-sm text-gray-400 mt-4">Funds ready to be withdrawn or spent on ads.</p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-3xl shadow-sm">
          <p className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-1 flex justify-between">
            <span>Locked Funds</span>
            <span>🔒</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900">₦{lockedBalance.toLocaleString()}</h1>
          <p className="text-sm text-gray-500 mt-4">
            Currently held for active bids in the Ad Arena. Returned at midnight if you lose.
          </p>
          {lockedBalance > 0 && (
            <a href="/merchant/auction" className="inline-block mt-3 text-sm font-bold text-blue-600 hover:underline">View Active Bids &rarr;</a>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* 2. Withdrawal Form */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm h-fit space-y-6">
          <h3 className="text-xl font-black text-gray-900">Withdraw Funds</h3>
          
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Amount to Withdraw (₦)</label>
              <input 
                type="number" required min="1000" max={walletBalance}
                value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-lg bg-white"
                placeholder="e.g. 50000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Select Bank</label>
              {/* <select 
                value={bankName} onChange={e => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-medium"
              >
                {banks.map(bank => <option key={bank.code} value={bank.name}>{bank.name}</option>)}
              </select> */}

              <select 
    value={bankCode} 
    onChange={e => {
      setBankCode(e.target.value);
      // Find the name that matches the selected code
      const selectedBank = banks.find(b => b.code === e.target.value);
      if (selectedBank) setBankName(selectedBank.name);
    }}
    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-medium"
  >
    {banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
  </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Account Number</label>
              <input 
                type="text" required maxLength={10} minLength={10}
                value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium bg-white"
                placeholder="0123456789"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" disabled={requesting || walletBalance < 1000}
              className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 shadow-md"
            >
              {requesting ? 'Processing...' : 'Request Withdrawal'}
            </button>
            <p className="text-xs text-center text-gray-500 font-medium">Standard processing time: 2-4 hours.</p>
          </form>
        </div>

        {/* 3. Transaction History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-6">Recent Transactions</h3>
          
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-2xl border border-gray-100">
                No transactions yet. Post a deal to start earning!
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-4">
                    {getTransactionIcon(tx.type, tx.status)}
                    <div>
                      <p className="font-bold text-gray-900 text-sm sm:text-base">
                        {getTransactionTitle(tx.type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-black text-lg ${
                      ['escrow_payment', 'bid_unlock', 'deposit'].includes(tx.type) ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {['escrow_payment', 'bid_unlock', 'deposit'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </p>
                    {tx.status === 'pending' && (
                      <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">Pending</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ⚡ 4. The Top-Up Modal Overlay */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowTopUp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">✖</button>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Top Up Wallet</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Add funds instantly via card or bank transfer.</p>

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₦)</label>
                <input 
                  type="number" required min="1000"
                  value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-lg"
                  placeholder="Min. ₦1,000"
                />
              </div>
              <button 
                type="submit" disabled={isToppingUp || Number(topUpAmount) < 1000}
                className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 flex justify-center gap-2"
              >
                {isToppingUp ? 'Connecting...' : 'Proceed to Payment 🔒'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}