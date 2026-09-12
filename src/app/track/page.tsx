'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TrackOrderPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [trkCode, setTrkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('escrows')
        .select(`
          id, 
          status, 
          delivery_otp, 
          total_paid,
          created_at,
          delivery_details, 
          deals (title, image_url, user_id),
          profiles!orders_merchant_id_fkey (business_name, phone)
        `)
        .eq('status', 'pending_delivery')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Filter by BOTH Email and Tracking Code to prevent merchant snooping
      const matchedOrders = data?.filter((order: any) => 
        order.delivery_details?.email?.toLowerCase() === email.toLowerCase().trim() &&
        order.delivery_details?.tracking_code === trkCode.trim().toUpperCase()
      ) || [];

      setMyOrders(matchedOrders);
      if (matchedOrders.length === 0) {
        setError('No active Escrow orders found with that Email and Tracking Code combination.');
      }
    } catch (err) {
      setError('System error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900">Track My Escrow</h1>
          <p className="text-gray-500 font-medium">Enter your email and the Secret Tracking Code from your receipt.</p>
        </div>

        {/* Dual Authentication Form */}
        <form onSubmit={handleSearch} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
              placeholder="The email used at checkout"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Secret Tracking Code</label>
            <input 
              type="text" required value={trkCode} onChange={e => setTrkCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900 uppercase tracking-widest"
              placeholder="e.g. TRK-A7X9"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 mt-2 text-lg"
          >
            {loading ? 'Searching...' : 'Find My PIN'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold border border-red-100">
            {error}
          </div>
        )}

        {/* Results */}
        {searched && myOrders.length > 0 && (
          <div className="space-y-4">
            {myOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                  <div>
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Awaiting Delivery</span>
                    <h4 className="font-bold text-gray-900 mt-2 line-clamp-1">{order.deals?.title}</h4>
                    <p className="text-sm text-gray-500">Sold by {order.profiles?.business_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">₦{order.total_paid.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center space-y-2">
                  <p className="text-sm font-bold text-blue-800 uppercase tracking-wider">Your Delivery PIN</p>
                  <p className="text-5xl font-black text-blue-900 tracking-[0.2em]">{order.delivery_otp}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}