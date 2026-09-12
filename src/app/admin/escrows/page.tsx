// src/app/admin/escrows/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const formatNGN = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
};

export default function AdminEscrowsPage() {
  const supabase = createClient();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'funded' | 'inspection' | 'disputed' | 'completed'>('all');
  
  // Dispute Modal State
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEscrows();
  }, [filter]);

  async function fetchEscrows() {
    setLoading(true);
    
    // 🚨 FIXED: Changed merchant_id to seller_id to match your schema!
    let query = supabase
      .from('escrows')
      .select(`
        id,
        amount,
        total_paid,
        status,
        gateway,
        created_at,
        gateway_reference,
        dispute_reason,
        asset_credentials,
        buyer:profiles!buyer_id(email),
        seller:profiles!seller_id(email), 
        deals ( title )
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching escrows:", error);
    if (data) setEscrows(data);
    
    setLoading(false);
  }

  const handleResolve = async (escrowId: string, resolution: 'payout_seller' | 'refund_buyer') => {
    const actionText = resolution === 'payout_seller' ? 'PAY THE SELLER' : 'REFUND THE BUYER';
    if (!confirm(`Are you sure you want to ${actionText}? This cannot be undone.`)) return;

    setResolvingId(escrowId);
    try {
      const res = await fetch('/api/admin/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowId, resolution }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Dispute resolved successfully.');
        // Update UI state immediately without refreshing
        setEscrows(escrows.map(e => e.id === escrowId ? { ...e, status: resolution === 'payout_seller' ? 'completed' : 'refunded' } : e));
        setSelectedDispute(null);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Network error.');
    }
    setResolvingId(null);
  };

  const tabs = [
    { label: 'All Ledgers', value: 'all' },
    { label: 'Funded', value: 'funded' },
    { label: 'In Inspection', value: 'inspection' },
    { label: 'Disputed 🚨', value: 'disputed' },
    { label: 'Completed', value: 'completed' }
  ] as const;

  return (
    <div className="p-6 md:p-12 space-y-8 relative font-sans">
      
      {/* 🚀 THE DISPUTE REVIEW MODAL */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl">
            <div className="bg-red-950/30 p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white mb-1">Review Dispute Case</h3>
                <p className="text-xs text-zinc-400 font-mono">ESC-{selectedDispute.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="text-zinc-500 hover:text-white font-bold">✕ Close</button>
            </div>
            
            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* Buyer Side */}
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase">Buyer Complaint</span>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl mt-1 text-red-300 font-medium whitespace-pre-wrap text-sm min-h-[100px]">
                  {selectedDispute.dispute_reason || "No reason provided."}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Buyer: <span className="text-zinc-300">{selectedDispute.buyer?.email}</span></p>
              </div>

              {/* Seller Side */}
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase">Asset Credentials Provided</span>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl mt-1 space-y-2 min-h-[100px]">
                  <p className="text-sm text-zinc-300 break-all"><span className="text-zinc-500 font-mono text-xs">URL:</span> {selectedDispute.asset_credentials?.url || 'N/A'}</p>
                  <p className="text-sm text-zinc-300"><span className="text-zinc-500 font-mono text-xs">USR:</span> {selectedDispute.asset_credentials?.username || 'N/A'}</p>
                  <p className="text-sm text-zinc-300"><span className="text-zinc-500 font-mono text-xs">PWD:</span> {selectedDispute.asset_credentials?.password || 'N/A'}</p>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Seller: <span className="text-zinc-300">{selectedDispute.seller?.email}</span></p>
              </div>
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleResolve(selectedDispute.id, 'refund_buyer')}
                disabled={resolvingId === selectedDispute.id}
                className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50"
              >
                {resolvingId === selectedDispute.id ? 'Processing...' : 'Refund Buyer'}
              </button>
              <button 
                onClick={() => handleResolve(selectedDispute.id, 'payout_seller')}
                disabled={resolvingId === selectedDispute.id}
                className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {resolvingId === selectedDispute.id ? 'Processing...' : 'Force Payout to Seller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Escrow Vaults</h1>
          <p className="text-zinc-400 mt-2 text-sm">Manage liquidity, resolve disputes, and view payouts.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button 
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              filter === tab.value 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* THE TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 font-bold animate-pulse">Loading Vaults...</div>
        ) : escrows.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-2xl mb-4">📭</div>
            <h3 className="text-white font-bold text-lg mb-1">No Escrows Found</h3>
            <p className="text-zinc-500 text-sm">There are no transactions matching this status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs">
                <tr>
                  <th className="p-5 font-bold uppercase tracking-wider">Ref / Item</th>
                  <th className="p-5 font-bold uppercase tracking-wider">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wider">Gateway</th>
                  <th className="p-5 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {escrows.map((escrow) => (
                  <tr key={escrow.id} className="hover:bg-zinc-800/30 transition-colors">
                    
                    {/* Item Details */}
                    <td className="p-5">
                      <p className="font-bold text-white mb-1 truncate max-w-[200px]">
                        {Array.isArray(escrow.deals) 
                          ? escrow.deals[0]?.title 
                          : (escrow.deals as any)?.title || 'Unknown Asset'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {escrow.gateway_reference || `ESC-${escrow.id.slice(0,8)}`}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="p-5">
                      <p className="font-black text-white text-base">{formatNGN(escrow.amount)}</p>
                    </td>

                    {/* Gateway Badge */}
                    <td className="p-5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        escrow.gateway === 'paystack' 
                          ? 'bg-blue-950/30 text-blue-400 border-blue-900' 
                          : 'bg-indigo-950/30 text-indigo-400 border-indigo-900'
                      }`}>
                        {escrow.gateway || 'Escrow'}
                      </span>
                    </td>

                    {/* Status Badges */}
                    <td className="p-5">
                      {escrow.status === 'awaiting_seller' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/50 text-amber-400 text-[10px] font-bold border border-amber-900/50 uppercase tracking-wider">
                          Awaiting Seller
                        </span>
                      )}
                      {escrow.status === 'inspection' && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-950/50 text-blue-400 text-[10px] font-bold border border-blue-900/50 animate-pulse uppercase tracking-wider">
                          Inspection
                        </span>
                      )}
                      {escrow.status === 'completed' && (
                        <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700 uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                      {escrow.status === 'refunded' && (
                        <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700 uppercase tracking-wider">
                          Refunded
                        </span>
                      )}
                      {escrow.status === 'disputed' && (
                        <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-400 text-[10px] font-bold border border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.2)] uppercase tracking-wider">
                          Disputed
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-5 text-right">
                      {escrow.status === 'disputed' ? (
                        <button 
                          onClick={() => setSelectedDispute(escrow)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-4 py-2 rounded-lg text-xs transition-all border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                          Review Case
                        </button>
                      ) : (
                        <span className="text-zinc-600 text-xs font-bold px-2">
                          No Action
                        </span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}