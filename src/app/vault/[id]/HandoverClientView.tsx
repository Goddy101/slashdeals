// app/vault/[id]/HandoverClientView.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { raiseDisputeAction } from '../actions';

interface DisputeMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

interface Props {
  escrow: any;
  orderOtp: string;
  trackingCode: string;
  isBuyer: boolean;
  isAdmin: boolean;
  initialMessages: DisputeMessage[];
}

export default function HandoverClientView({ 
  escrow, 
  orderOtp, 
  trackingCode, 
  isBuyer, 
  isAdmin,
  initialMessages 
}: Props) {
  const supabase = createClient();
  
  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0, minutes: 0, seconds: 0, isExpired: false
  });
  
  // Dispute & Chat State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [messages, setMessages] = useState<DisputeMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Live Countdown Timer Engine
  useEffect(() => {
    if (!escrow.inspection_expires_at || escrow.status !== 'funded') return;

    const expiryTime = new Date(escrow.inspection_expires_at).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        clearInterval(interval);
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [escrow.inspection_expires_at, escrow.status]);

  // 2. Real-time Supabase Subscription for Chat / Dispute Messages
  useEffect(() => {
    const channel = supabase
      .channel(`public:dispute_messages:escrow_id=eq.${escrow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `escrow_id=eq.${escrow.id}`,
        },
        (payload) => {
          const newMsg = payload.new as DisputeMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escrow.id, supabase]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Opening Dispute
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('escrowId', escrow.id);
    formData.append('complaint', complaint);

    try {
      await raiseDisputeAction(formData);
      setShowDisputeModal(false);
      setComplaint('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sending Chat / Evidence Message inside the room
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('dispute_messages').insert({
        escrow_id: escrow.id,
        sender_id: user.id,
        message: newMessage.trim(),
        is_admin: isAdmin
      });

      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Asset Summary Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Item in Escrow</p>
          <h2 className="text-xl font-black text-white">
            {Array.isArray(escrow.listings) ? escrow.listings[0]?.title : escrow.listings?.title || 'SlashDeals Asset'}
          </h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Secured Amount</p>
          <p className="text-2xl font-black text-emerald-400">₦{escrow.amount.toLocaleString()}</p>
        </div>
      </div>

      {/* Status Banners */}
      {escrow.status === 'disputed' && (
        <div className="bg-red-950/40 border border-red-900/60 p-6 rounded-3xl space-y-2">
          <h3 className="text-lg font-black text-red-400">🚨 Transaction Under Active Dispute</h3>
          <p className="text-sm text-zinc-300">
            The 48-hour countdown has been frozen. Use the secure evidence log below to upload links, images, or communicate directly with the admin.
          </p>
        </div>
      )}

      {escrow.status === 'completed' && (
        <div className="bg-emerald-950/40 border border-emerald-900/60 p-6 rounded-3xl space-y-2">
          <h3 className="text-lg font-black text-emerald-400">✅ Escrow Completed & Settled</h3>
          <p className="text-sm text-zinc-300">
            Funds have been successfully disbursed. Thank you for using SlashDeals!
          </p>
        </div>
      )}

      {/* Active Escrow Grid (Timer & OTP) */}
      {escrow.status === 'funded' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Countdown Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inspection Window</span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              </div>
              <h3 className="text-sm text-zinc-300 mb-6">
                {isBuyer ? 'Inspect your item within this timeframe before releasing funds.' : 'Awaiting buyer inspection and release.'}
              </h3>
            </div>

            <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 text-center">
              <div className="flex justify-center gap-3 font-mono text-3xl font-black text-white">
                <span>{String(timeLeft.hours).padStart(2, '0')}</span>:
                <span>{String(timeLeft.minutes).padStart(2, '0')}</span>:
                <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-2">Hours : Minutes : Seconds</p>
            </div>
          </div>

          {/* OTP / Delivery PIN Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Secure Delivery PIN</span>
              <p className="text-xs text-zinc-500">Give this code to the vendor *only* when you receive the item.</p>
            </div>

            <div className="bg-blue-950/40 border border-blue-900/50 rounded-2xl p-4 text-center my-4">
              <p className="text-4xl font-black text-blue-400 tracking-[0.2em] font-mono">{isBuyer ? orderOtp : '••••'}</p>
              {!isBuyer && <p className="text-xs text-zinc-500 mt-1">(Hidden from vendor view until handover)</p>}
            </div>

            <p className="text-[11px] text-zinc-500 text-center font-mono">Tracking Ref: {trackingCode}</p>
          </div>

        </div>
      )}

      {/* Action Buttons for Buyer */}
      {isBuyer && escrow.status === 'funded' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => alert('To release funds, please check your confirmation email or coordinate via support.')}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-2xl transition-all shadow-lg text-center cursor-pointer"
          >
            ✅ Satisfied — Release Payout
          </button>

          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black py-4 rounded-2xl transition-all text-center cursor-pointer"
          >
            🚨 Report Faulty Asset / Dispute
          </button>
        </div>
      )}

      {/* Real-time Evidence / Communication Log (Active for Disputed or General Support) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-black text-white">Handover / Dispute Communication Log</h3>
          <p className="text-xs text-zinc-400">Secure three-way channel between Buyer, Seller, and Platform Admin.</p>
        </div>

        <div 
          ref={chatScrollRef}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 font-sans"
        >
          {messages.length === 0 ? (
            <p className="text-center text-xs text-zinc-600 py-16">No messages recorded in this vault yet.</p>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-3 rounded-xl text-sm ${
                  msg.is_admin 
                    ? 'bg-amber-950/30 border border-amber-900/50 text-amber-200' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                  <span className="font-bold">{msg.is_admin ? '🛡️ Admin / Judge' : 'Participant'}</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Message Input Box */}
        {escrow.status !== 'completed' && (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type evidence, clarification, or message..."
              className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim()}
              className="bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-bold px-6 py-3 rounded-xl text-sm transition-all"
            >
              {sendingMessage ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </div>

      {/* Dispute Modal Popup */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6">
            <h3 className="text-xl font-black text-white">Open Dispute Vault</h3>
            <p className="text-sm text-zinc-400">
              Explain why this asset is faulty or does not match the listing. This will instantly freeze the 48-hour payout timer.
            </p>

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Describe the issue in detail (e.g., screen cracked, battery dead)..."
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl p-4 focus:outline-none focus:border-red-500 text-sm"
                required
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-zinc-950 font-black py-3 rounded-xl text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Freezing Vault...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}