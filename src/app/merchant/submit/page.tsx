'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Wrap the form in a sub-component so we can use `useSearchParams` safely with Suspense
function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    deal_url: '',
    category: 'tech',
    original_price: '',
    deal_price: '',
    description: '',
    location: 'National',
    image_url: '',
    is_escrow_enabled: true, // Default to true because it's our USP
    is_affiliate: false,
    commission_rate: '0',
    stock_quantity: '10'
  });

  useEffect(() => {
    // 1. Get logged-in user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
      else router.push('/login'); // Redirect if not logged in
    });

    // 2. Catch the URL from the Bouncer
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setFormData(prev => ({ ...prev, deal_url: urlParam }));
    }
  }, [searchParams, router, supabase.auth]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (Number(formData.deal_price) >= Number(formData.original_price)) {
      setMessage({ text: 'Deal price must be lower than original price!', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .insert([{
          user_id: userId,
          title: formData.title,
          deal_url: formData.deal_url,
          category: formData.category,
          original_price: Number(formData.original_price),
          deal_price: Number(formData.deal_price),
          description: formData.description,
          location: formData.location,
          image_url: formData.image_url,
          is_escrow_enabled: formData.is_escrow_enabled,
          is_affiliate: formData.is_affiliate,
          commission_rate: formData.is_affiliate ? Number(formData.commission_rate) : 0,
          stock_quantity: Number(formData.stock_quantity)
        }])
        .select()
        .single();

      if (error) throw error;

      setMessage({ text: 'Deal posted successfully! Redirecting...', type: 'success' });
      
      // Send them straight to the live deal page so they can share it on WhatsApp
      setTimeout(() => router.push(`/deal/${data.id}`), 1500);

    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to post deal.', type: 'error' });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-200 shadow-sm space-y-8">
      
      {/* 1. Core Deal Info */}
      <div className="space-y-5">
        <h3 className="text-xl font-black text-gray-900 border-b pb-2">Product Details</h3>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Deal Link / Target URL</label>
          <input 
            type="url" name="deal_url" required value={formData.deal_url} onChange={handleInputChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-gray-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Product Title</label>
          <input 
            type="text" name="title" required maxLength={120} value={formData.title} onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
            placeholder="e.g. UK Used iPhone 13 Pro (256GB)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
            <input 
              type="number" name="original_price" required min="1" value={formData.original_price} onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none text-gray-500 line-through"
              placeholder="650000"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Slash Price (₦)</label>
            <input 
              type="number" name="deal_price" required min="1" value={formData.deal_price} onChange={handleInputChange}
              className="w-full px-4 py-3 border border-red-300 bg-red-50 text-red-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-black text-lg"
              placeholder="480000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white">
              <option value="tech">Tech & Gadgets</option>
              <option value="fashion">Fashion & Wigs</option>
              <option value="food">Food & Dining</option>
              <option value="groceries">Groceries</option>
              <option value="services">Services</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Image URL (For MVP)</label>
            <input 
              type="url" name="image_url" value={formData.image_url} onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* 2. The Growth Engines (Escrow & Affiliate) */}
      <div className="space-y-5 bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <h3 className="text-lg font-black text-gray-900">Boost Your Sales</h3>
        
        {/* Escrow Toggle */}
        <label className="flex items-start gap-4 cursor-pointer p-4 bg-white rounded-xl border border-green-200 shadow-sm hover:border-green-400 transition-colors">
          <input 
            type="checkbox" name="is_escrow_enabled" checked={formData.is_escrow_enabled} onChange={handleInputChange}
            className="w-6 h-6 mt-1 text-green-600 rounded focus:ring-green-500"
          />
          <div>
            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
              Enable Escrow Protection <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">Recommended</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Get the green 🛡️ shield on your deal. Buyers pay us, we hold the money, you ship the item, and we pay you 100% of your money upon delivery. Skyrockets conversion rates.</p>
          </div>
        </label>

        {/* Affiliate Toggle */}
        <label className="flex items-start gap-4 cursor-pointer p-4 bg-white rounded-xl border border-purple-200 shadow-sm hover:border-purple-400 transition-colors">
          <input 
            type="checkbox" name="is_affiliate" checked={formData.is_affiliate} onChange={handleInputChange}
            className="w-6 h-6 mt-1 text-purple-600 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
              Activate Affiliate Army <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">Viral</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Allow campus reps and influencers to market this deal for you. You only pay them if they successfully bring a buyer who pays.</p>
            
            {formData.is_affiliate && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">Commission:</span>
                <div className="relative w-32">
                  <input 
                    type="number" name="commission_rate" min="1" max="50" required value={formData.commission_rate} onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold pr-8"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-gray-400">%</span>
                </div>
              </div>
            )}
          </div>
        </label>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <button 
        type="submit" disabled={loading}
        className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 text-lg shadow-md"
      >
        {loading ? 'Slashing Price...' : 'Post Deal & Generate Link'}
      </button>
    </form>
  );
}

export default function SubmitDealPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Drop a Deal</h1>
          <p className="text-gray-500 font-medium mt-2">Add your inventory. Get the Escrow shield. Let buyers trust you.</p>
        </div>
        
        {/* Suspense boundary required by Next.js when using useSearchParams */}
        <Suspense fallback={<div className="text-center p-10 font-bold">Loading form...</div>}>
          <SubmitForm />
        </Suspense>
      </div>
    </div>
  );
}