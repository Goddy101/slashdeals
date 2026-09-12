'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PostDigitalAsset() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Main categorization state
  const [parentCategory, setParentCategory] = useState<'startup' | 'social'>('startup');
  const [wantsVerification, setWantsVerification] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    deal_url: '',
    deal_price: '',
    description: '',
    
    // Startup specifics
    asset_type: 'saas',
    monthly_revenue: '',
    monthly_traffic: '',
    tech_stack: '',
    
    // Social specifics
    platform: 'instagram',
    follower_count: '',
    engagement_rate: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to list an asset.');

      const isSocial = parentCategory === 'social';
      const dealPriceNum = Number(formData.deal_price);

      // Insert into database
      const { data, error: dbError } = await supabase.from('deals').insert([{
        title: formData.title,
        deal_url: formData.deal_url,
        description: formData.description,
        deal_price: dealPriceNum,
        category: 'Startups', // Main category for digital assets
        
        // Dynamic Fields based on selection
        asset_type: isSocial ? 'social_account' : formData.asset_type,
        platform: isSocial ? formData.platform : null,
        monthly_revenue: !isSocial ? Number(formData.monthly_revenue) || 0 : 0,
        monthly_traffic: !isSocial ? Number(formData.monthly_traffic) || 0 : 0,
        tech_stack: !isSocial ? formData.tech_stack : null,
        follower_count: isSocial ? Number(formData.follower_count) || 0 : 0,
        engagement_rate: isSocial ? Number(formData.engagement_rate) || 0 : 0,

        is_escrow_enabled: true, // ALWAYS true for digital assets
        status: wantsVerification ? 'pending_review' : 'active',
        user_id: user.id
      }]).select().single();

      if (dbError) throw dbError;

      // ⚡ AGGRESSIVE GROWTH LEVER 1: Supply-Side Telemetry
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: data.id, eventType: 'publish' }),
      }).catch(() => {}); // Fire and forget

      // ⚡ AGGRESSIVE GROWTH LEVER 2: Auto-Queue Social Post (If high-ticket and not locked for review)
      if (!wantsVerification && dealPriceNum >= 500000) {
        fetch('/api/webhooks/social-generator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'NEW_HIGH_TICKET_LISTING',
            listing_data: {
              id: data.id,
              price: dealPriceNum,
              location_name: 'Digital Escrow Vault', // Digital assets are location-agnostic
              category_name: isSocial ? 'Monetized Social Account' : 'Tech Startup / SaaS'
            }
          })
        }).catch(() => {});
      }

      // Redirect based on upsell choice
      if (wantsVerification) {
        router.push(`/merchant/checkout?deal_id=${data.id}&type=verification`);
      } else {
        router.push(`/deal/${data.id}`);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to list asset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Sell Your Digital Asset</h1>
          <p className="mt-2 text-gray-500 font-medium">Get in front of thousands of verified investors securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. Asset Classification Toggle */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm">
            <label className="block text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">1. What are you selling?</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setParentCategory('startup')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  parentCategory === 'startup' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-2">💻</div>
                <div className="font-bold text-gray-900">Tech / Website</div>
                <div className="text-xs text-gray-500 mt-1">SaaS, E-commerce, Domains</div>
              </button>
              
              <button
                type="button"
                onClick={() => setParentCategory('social')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  parentCategory === 'social' 
                  ? 'border-pink-600 bg-pink-50' 
                  : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="text-2xl mb-2">📱</div>
                <div className="font-bold text-gray-900">Social Account</div>
                <div className="text-xs text-gray-500 mt-1">Instagram, YouTube, TikTok</div>
              </button>
            </div>
          </div>

          {/* 2. Core Details */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-6">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-3">2. Core Details</label>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Asset Name</label>
              <input required type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. ProTasker SaaS or @LagosGossip" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Asking Price (₦)</label>
                <input required type="number" name="deal_price" value={formData.deal_price} onChange={handleInputChange} placeholder="e.g. 5000000" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Live URL</label>
                <input required type="url" name="deal_url" value={formData.deal_url} onChange={handleInputChange} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Pitch / Description</label>
              <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Why should an investor buy this? What is the growth potential?" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"></textarea>
            </div>
          </div>

          {/* 3. DYNAMIC SECTION: The Metrics */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-6">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-3">
              3. {parentCategory === 'startup' ? 'Financials & Tech' : 'Audience Metrics'}
            </label>

            {parentCategory === 'startup' ? (
              // STARTUP METRICS
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asset Sub-Type</label>
                    <select name="asset_type" value={formData.asset_type} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                      <option value="saas">SaaS (Software as a Service)</option>
                      <option value="ecommerce">E-Commerce Store</option>
                      <option value="content_site">Blog / Content Site</option>
                      <option value="mobile_app">Mobile App</option>
                      <option value="domain_name">Premium Domain Name</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Revenue (₦)</label>
                    <input type="number" name="monthly_revenue" value={formData.monthly_revenue} onChange={handleInputChange} placeholder="Average last 3 months" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium font-mono text-emerald-700" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Traffic / Users</label>
                    <input type="number" name="monthly_traffic" value={formData.monthly_traffic} onChange={handleInputChange} placeholder="e.g. 15000" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tech Stack</label>
                    <input type="text" name="tech_stack" value={formData.tech_stack} onChange={handleInputChange} placeholder="e.g. Next.js, Node, Supabase" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>
              </>
            ) : (
              // SOCIAL MEDIA METRICS
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Platform</label>
                    <select name="platform" value={formData.platform} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none font-medium">
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="x_twitter">X / Twitter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Total Followers</label>
                    <input type="number" name="follower_count" value={formData.follower_count} onChange={handleInputChange} placeholder="e.g. 50000" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none font-medium font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Engagement Rate (%)</label>
                    <input type="number" step="0.1" name="engagement_rate" value={formData.engagement_rate} onChange={handleInputChange} placeholder="e.g. 4.5" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none font-medium font-mono" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 4. Monetization Upsell: The Due Diligence Badge */}
          <div className={`p-6 rounded-[24px] border-2 transition-all cursor-pointer ${wantsVerification ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-white hover:border-emerald-300'}`} onClick={() => setWantsVerification(!wantsVerification)}>
            <div className="flex gap-4 items-start">
              <div className={`w-6 h-6 mt-1 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${wantsVerification ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                {wantsVerification && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  Get the "Verified Asset" Badge <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase px-2 py-1 rounded">Sells 5x Faster</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Pay a one-time <strong>₦15,000</strong> fee. Our team will manually review your Paystack/Stripe dashboards or social analytics. Verified assets are pinned to the top of the feed and attract serious buyers instantly.
                </p>
              </div>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 py-3 rounded-lg">{error}</div>}

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="w-full bg-zinc-900 text-white font-black text-lg py-5 rounded-2xl hover:bg-black transition-all hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
            {loading ? 'Processing...' : (
              <>
                🔒 Lock in Listing {wantsVerification && '& Pay ₦15,000'}
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 font-medium">
            By listing this asset, you agree to the SlashDeals 48-Hour Digital Escrow Handover Protocol.
          </p>

        </form>
      </div>
    </div>
  );
}