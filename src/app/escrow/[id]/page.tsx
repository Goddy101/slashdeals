'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function EscrowHandoverRoom() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  // Escrow State now includes 'disputed'
  const [escrowState, setEscrowState] = useState<'awaiting_seller' | 'inspection' | 'completed' | 'disputed'>('awaiting_seller');
  
  // Debug State (Toggle between Buyer & Seller views for testing)
  const [currentUserRole, setCurrentUserRole] = useState<'buyer' | 'seller'>('seller');

  // Dispute Modal States
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState('47:59:59');

  // Form State for Seller Uploads
  const [handoverData, setHandoverData] = useState({
    url: '',
    username: '',
    password: '',
    authCode: '',
    notes: ''
  });

  // Simulated Timer Countdown
  useEffect(() => {
    if (escrowState === 'inspection') {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          const parts = prev.split(':').map(Number);
          let [h, m, s] = parts;
          if (s > 0) s--;
          else { s = 59; if (m > 0) m--; else { m = 59; h--; } }
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [escrowState]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  
  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure? Once submitted, the 48-hour inspection timer begins and the buyer gains access.')) return;
    
    setLoading(true);
    // In production, you will call fetch('/api/escrow/handover') here
    setTimeout(() => {
      setEscrowState('inspection');
      setCurrentUserRole('buyer'); // Auto-switch to buyer view for demo
      setLoading(false);
    }, 1500);
  };

  const handleBuyerApprove = async () => {
    if (!confirm('WARNING: Approving this releases the ₦5,125,000 to the seller immediately. Are you sure you have fully secured the asset?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/escrow/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowId: params.id }),
      });
      const data = await res.json();
      
      // For demo purposes, we will force success if API isn't ready
      setEscrowState('completed');
    } catch(e) {
      alert("Network error.");
    }
    setLoading(false);
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowId: params.id, reason: disputeReason }),
      });
      const data = await res.json();
      
      // For demo purposes, we will force success if API isn't ready
      setShowDisputeModal(false);
      setEscrowState('disputed');
    } catch(e) {
      alert("Network error.");
    }
    setLoading(false);
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  
  return (
    <div className="min-h-screen bg-[#090E17] font-sans pb-24 text-zinc-300 relative">
      
      {/* 🚀 THE DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2">Open a Dispute</h3>
            <p className="text-zinc-400 mb-6 text-sm">This will instantly freeze the funds and pause the 48-hour timer. Our admin team will step in to review the credentials.</p>
            
            <form onSubmit={handleDisputeSubmit}>
              <textarea 
                required
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain exactly what is wrong (e.g., 'The password provided is incorrect' or 'The GitHub repo is empty')."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none h-32 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDisputeModal(false)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors">
                  {loading ? 'Freezing...' : 'Freeze Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEV DEBUG TOGGLE - Remove in Production */}
      <div className="bg-blue-600/20 border-b border-blue-500/30 px-4 py-2 flex justify-between items-center z-50 relative">
        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Developer Debug Mode</span>
        <div className="flex gap-2">
          <button onClick={() => setCurrentUserRole('seller')} className={`px-3 py-1 text-xs font-bold rounded-md ${currentUserRole === 'seller' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>View as Seller</button>
          <button onClick={() => setCurrentUserRole('buyer')} className={`px-3 py-1 text-xs font-bold rounded-md ${currentUserRole === 'buyer' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>View as Buyer</button>
        </div>
      </div>

      {/* Header Vault UI */}
      <div className="border-b border-white/10 bg-zinc-950/50 pt-8 pb-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${escrowState === 'disputed' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${escrowState === 'disputed' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {escrowState === 'disputed' ? 'Vault Frozen' : 'Active Escrow Vault'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white">Project Acquisition</h1>
              <p className="text-sm text-zinc-500">ID: ESC-{((typeof params.id === 'string' ? params.id : params.id?.[0])?.slice(0, 8) || '88492A9C').toUpperCase()}</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-right min-w-[200px]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Locked Funds</p>
            <p className="text-2xl font-black text-white tracking-tight">₦5,125,000</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* =========================================
            STATE 1: AWAITING SELLER UPLOAD 
           ========================================= */}
        {escrowState === 'awaiting_seller' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h3 className="font-bold text-white mb-2">Protocol Active</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The buyer's funds have been verified and locked by SlashDeals. 
                </p>
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 font-medium">
                    ⚠️ Never send credentials via WhatsApp. Only use this secure vault.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              {currentUserRole === 'buyer' ? (
                <div className="bg-zinc-900 rounded-[24px] border border-zinc-800 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                  <h2 className="text-xl font-black text-white mb-2">Awaiting Seller Credentials</h2>
                  <p className="text-zinc-400 font-medium max-w-sm mx-auto">
                    We have notified the seller that your funds are locked. The 48-hour inspection period will begin as soon as they upload the access details here.
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-[24px] border border-zinc-800 p-8">
                  <h2 className="text-xl font-black text-white mb-6">Hand Over Asset Access</h2>
                  <form onSubmit={handleSellerSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Github / Repo / Domain Link</label>
                      <input type="text" required placeholder="https://github.com/..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Admin / OG Email</label>
                        <input type="text" required placeholder="admin@domain.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
                        <input type="text" required placeholder="••••••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Domain Auth Code (EPP)</label>
                      <input type="text" placeholder="Only required for domain transfers" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Handover Notes for Buyer</label>
                      <textarea rows={3} placeholder="Instructions on how to change the email, deploy the code, etc." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"></textarea>
                    </div>

                    <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white font-black text-lg py-4 rounded-xl hover:bg-emerald-500 transition-colors mt-4">
                      {loading ? 'Encrypting & Securing...' : 'Submit Credentials & Start Timer'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            STATE 2: INSPECTION PERIOD 
           ========================================= */}
        {escrowState === 'inspection' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-[24px] border-2 border-red-500/20 p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.05)]">
              <p className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Security Lockdown Active</p>
              <div className="text-6xl md:text-8xl font-black text-white tracking-tighter font-mono tabular-nums">
                {timeLeft}
              </div>
              <p className="text-zinc-500 mt-4 max-w-md mx-auto font-medium">
                If the buyer does not approve or open a dispute before this timer hits zero, funds will automatically release to the seller.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 rounded-[24px] border border-zinc-800 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-white text-lg">Asset Credentials</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase px-2 py-1 rounded">Unlocked</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Link / Repo</p>
                    <p className="text-sm text-white font-mono mt-1 select-all">github.com/founder/project</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Username / Email</p>
                    <p className="text-sm text-white font-mono mt-1 select-all">admin@startup.com</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Password</p>
                    <p className="text-sm text-white font-mono mt-1 select-all">CorrectHorseBatteryStaple123!</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-[24px] border border-zinc-800 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-white text-lg mb-4">Required Actions</h3>
                  {currentUserRole === 'buyer' ? (
                    <ul className="space-y-3 text-sm text-zinc-400">
                      <li className="flex gap-2"><span>1.</span> Log in and immediately change the password.</li>
                      <li className="flex gap-2"><span>2.</span> Change the recovery email and phone number.</li>
                      <li className="flex gap-2"><span>3.</span> Enable your own Two-Factor Authentication (2FA).</li>
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      You have completed your requirements. Do not attempt to log into the asset or recover the password. Doing so will trigger an automatic fraud dispute.
                    </p>
                  )}
                </div>
                
                {currentUserRole === 'buyer' && (
                  <div className="mt-8 space-y-3">
                    <button onClick={handleBuyerApprove} disabled={loading} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-500 transition-colors">
                      {loading ? 'Releasing Funds...' : '✅ I Have Secured the Asset - Release Funds'}
                    </button>
                    <button 
                      onClick={() => setShowDisputeModal(true)} 
                      className="w-full bg-transparent border border-zinc-700 text-zinc-400 font-bold py-4 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      🛑 Dispute: Details don't work
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            STATE 3: COMPLETED 
           ========================================= */}
        {escrowState === 'completed' && (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-[24px] p-12 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-white">✓</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Transfer Complete</h2>
            <p className="text-emerald-200/70 font-medium max-w-md mx-auto mb-8">
              The buyer has secured the asset and the funds (₦5,125,000) have been successfully released to the seller's wallet.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">
              Return to Dashboard &rarr;
            </Link>
          </div>
        )}

        {/* =========================================
            STATE 4: DISPUTED (FROZEN)
           ========================================= */}
        {escrowState === 'disputed' && (
          <div className="bg-red-900/10 border border-red-500/30 rounded-[24px] p-8 md:p-12 text-center shadow-[0_0_50px_rgba(239,68,68,0.05)]">
            <div className="w-20 h-20 bg-red-500/20 border border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🛑</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Funds Frozen</h2>
            <p className="text-red-200/70 font-medium max-w-md mx-auto mb-8">
              A dispute has been opened. The 48-hour countdown has been halted and the ₦5,125,000 is securely locked in our vault.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-lg mx-auto text-left mb-8">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Next Steps</h4>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex gap-3"><span>1.</span> A SlashDeals Admin will review the submitted credentials within 24 hours.</li>
                <li className="flex gap-3"><span>2.</span> If the credentials are invalid, the buyer will be refunded in full.</li>
                <li className="flex gap-3"><span>3.</span> If the credentials work, the funds will be released to the seller to prevent buyer fraud.</li>
              </ul>
            </div>
            
            <a href="mailto:support@slashdeals.ng" className="text-red-400 hover:text-red-300 font-bold text-sm">
              Contact Support Team &rarr;
            </a>
          </div>
        )}

      </div>
    </div>
  );
}