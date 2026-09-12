// src/app/merchant/advertise/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

const CATEGORIES = [
  { id: 'tech', name: 'Tech & Gadgets', price: 150000, available: true },
  { id: 'digital_assets', name: 'Digital Assets & SaaS', price: 250000, available: true },
  { id: 'fashion', name: 'Fashion & Apparel', price: 100000, available: false }, // Simulating scarcity
  { id: 'services', name: 'Professional Services', price: 120000, available: true },
];

export default function AdvertisePage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [headline, setHeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dealLink, setDealLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isUploading, setIsUploading] = useState(false); // 🚀 Add this
  
  const supabase = createClient(); // 🚀 Add this



// 🚀 The Auto-Compressing Uploader
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Silent Compression Settings (Shrinks 20MB to ~300KB)
      const options = {
        maxSizeMB: 0.5, // Max 500KB
        maxWidthOrHeight: 800, // Perfect for a sidebar banner
        useWebWorker: true, // Speeds up compression using background threads
      };

      // 2. Compress the file BEFORE uploading
      const compressedFile = await imageCompression(file, options);
      
      // Create a unique file name
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `banner-${Date.now()}.${fileExt}`;

      // 3. Upload the tiny, optimized file to Supabase
      const { error } = await supabase.storage
        .from('ad-banners')
        .upload(fileName, compressedFile);

      if (error) throw error;

      // 4. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('ad-banners')
        .getPublicUrl(fileName);

      setImageUrl(publicUrlData.publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to process image. Please try a different photo.");
    } finally {
      setIsUploading(false);
    }
  };

const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🛡️ FRONTEND VALIDATION: Ensure the link contains a valid Deal UUID
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    if (!uuidRegex.test(dealLink)) {
      alert("⚠️ Please paste a valid SlashDeals link. It must contain the Deal ID so we can route buyers correctly.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Send the ad details to our new API route
      const res = await fetch('/api/campaigns/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          price: selectedCategory.price,
          headline,
          imageUrl,
          dealLink
        })
      });

      const data = await res.json();

      // Redirect to the Paystack payment screen
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to initialize secure checkout.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <Link href="/merchant/dashboard" className="text-sm font-bold text-gray-500 hover:text-black mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black text-gray-900">Category Monopoly</h1>
        <p className="text-lg text-gray-500 mt-2 max-w-3xl">
          Lock out your competitors. Own 100% of the sidebar ad inventory for your chosen category for 30 days. Drive high-intent buyers directly to your escrow checkout.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Left Column: The Campaign Builder */}
        <div className="space-y-8">
          <form onSubmit={handleCheckout} className="space-y-6">
            
            {/* Step 1: Category Selection */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
                Select Your Territory
              </h3>
              <div className="space-y-3">
                {CATEGORIES.map((cat) => (
                  <label 
                    key={cat.id} 
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      !cat.available ? 'opacity-50 bg-gray-50' : 
                      selectedCategory.id === cat.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="category" 
                        disabled={!cat.available}
                        checked={selectedCategory.id === cat.id}
                        onChange={() => setSelectedCategory(cat)}
                        className="w-5 h-5 accent-black"
                      />
                      <span className="font-bold text-gray-900">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      {cat.available ? (
                        <span className="font-black text-gray-900">₦{cat.price.toLocaleString()}/mo</span>
                      ) : (
                        <span className="text-red-500 font-bold text-sm">Sold Out</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Creative Assets */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
                Design Your Ad
              </h3>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Attention-Grabbing Headline</label>
                <input 
                  type="text" 
                  maxLength={50}
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Get 50% Off Premium Laptops"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{headline.length}/50</p>
              </div>

              {/* <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Image URL (Square 1:1)</label>
                <input 
                  type="url" 
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://yoursite.com/banner.png"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
              </div> */}


              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ad Banner Image (Square 1:1)</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-black transition-colors bg-gray-50">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    {isUploading ? (
                      <p className="text-sm font-bold text-blue-600 animate-pulse">Uploading to server... ⏳</p>
                    ) : imageUrl ? (
                      <p className="text-sm font-bold text-green-600">✅ Image attached successfully! Click to change.</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-900">Click to upload an image</p>
                        <p className="text-xs text-gray-500">JPG, PNG or WEBP (Max 2MB)</p>
                      </>
                    )}
                  </div>
                </div>
                {/* We keep a hidden input to easily pass the url to your checkout function */}
                <input type="hidden" value={imageUrl} required />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Target Deal Link</label>
                <input 
                  type="url" 
                  required
                  value={dealLink}
                  onChange={(e) => setDealLink(e.target.value)}
                  placeholder="Paste your SlashDeals item link here"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Keep buyers inside the platform to utilize the Escrow engine for higher conversion rates.
                </p>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-all text-lg shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Initializing Secure Vault...' : `Pay ₦${selectedCategory.price.toLocaleString()} & Launch`}
              <span>🚀</span>
            </button>
            <p className="text-center text-sm text-gray-500 font-medium">
              🔒 Payments secured by Paystack. Goes live instantly.
            </p>
          </form>
        </div>

        {/* Right Column: Live Preview & ROI Logic */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 sticky top-6">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 text-center">
              Live Deal Page Preview
            </h3>

            {/* The actual Sidebar Ad Component Preview */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-xs mx-auto transition-all hover:shadow-md">
              <div className="w-full aspect-square bg-gray-100 flex items-center justify-center border-b border-gray-100 overflow-hidden relative">
                {imageUrl ? (
                  <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-bold">Image Preview</span>
                )}
                <span className="absolute top-2 left-2 bg-black/70 backdrop-blur text-white text-[10px] font-bold uppercase px-2 py-1 rounded">
                  Sponsored
                </span>
              </div>
              <div className="p-4 space-y-3">
                <h4 className="font-black text-gray-900 leading-tight">
                  {headline || "Your headline will appear exactly like this"}
                </h4>
                <div className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg text-center">
                  View Deal →
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4">What happens next?</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="text-green-500">✅</span> Your ad goes live immediately across all <strong>{selectedCategory.name}</strong> pages.
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">✅</span> You get exclusive 100% share-of-voice for 30 days. No competitors.
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">✅</span> Track real-time views, clicks, and escrow conversions from your dashboard.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}