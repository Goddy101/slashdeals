'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default async function DealSubmitForm() {
  const [loading, setLoading] = useState(false);
  const [successDeal, setSuccessDeal] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  
 // const supabase = createClient();

 const supabase = await createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setCopied(false);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const merchantName = formData.get('merchantName') as string;
    const dealPrice = Number(formData.get('dealPrice'));
    const originalPrice = Number(formData.get('originalPrice'));
    const dealUrl = formData.get('dealUrl') as string;
    const category = formData.get('category') as string;
    const isEscrow = formData.get('isEscrow') === 'on';

    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();

    // Insert into Supabase deals table
    const { data, error } = await supabase
      .from('deals')
      .insert([
        {
          title,
          merchant_name: merchantName,
          deal_price: dealPrice,
          original_price: originalPrice,
          deal_url: dealUrl,
          category,
          is_escrow: isEscrow,
          user_id: user?.id || null,
          upvotes_count: 1, // Start with 1 upvote
        }
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Error posting deal: ' + error.message);
    } else {
      setSuccessDeal(data);
    }
  }

  // Generate viral social copy template
  const getSocialCopy = () => {
    if (!successDeal) return '';
    const discount = Math.round(((successDeal.original_price - successDeal.deal_price) / successDeal.original_price) * 100);
    const link = `${window.location.origin}/api/deals/${successDeal.id}/click`;
    
    return `🔥 PRICE SLASH ALERT: ${successDeal.title}\n\n` +
           `💰 Now: ₦${successDeal.deal_price.toLocaleString()} (Was ₦${successDeal.original_price.toLocaleString()}) - Save ${discount}%\n` +
           `🏪 Vendor: ${successDeal.merchant_name}\n` +
           `${successDeal.is_escrow ? '🛡️ Protected by Paystack Escrow (Zero Scam Risk)\n\n' : '\n'}` +
           `👉 Claim this deal instantly here: ${link}`;
  };

  const handleCopySocial = () => {
    navigator.clipboard.writeText(getSocialCopy());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (successDeal) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-green-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h3 className="text-2xl font-black text-gray-900">Deal Published Successfully!</h3>
          <p className="text-gray-500 text-sm">Your deal is now live on the public feed. Now, blast it to your social channels to drive instant sales.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ready-to-Post Social Media Copy</label>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans bg-white p-4 rounded-lg border border-gray-200">
            {getSocialCopy()}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopySocial}
            className="flex-1 bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors text-sm"
          >
            {copied ? '✓ Copied to Clipboard!' : 'Copy Social Media Post'}
          </button>
          
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getSocialCopy())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1DA1F2] text-white font-bold py-3 px-4 rounded-xl text-center hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
          >
            Share on X (Twitter)
          </a>
        </div>

        <button
          onClick={() => setSuccessDeal(null)}
          className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-900 pt-2"
        >
          + Post Another Deal
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
      <div>
        <h3 className="text-xl font-black text-gray-900">Post a New Deal</h3>
        <p className="text-gray-500 text-sm mt-1">List your discount to appear on the public board and generate trackable links.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title</label>
          <input 
            name="title" 
            required 
            placeholder="e.g. Brand New Sony WH-1000XM4 Wireless Headphones" 
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Merchant / Store Name</label>
            <input 
              name="merchantName" 
              required 
              placeholder="e.g. GadgetHub Lagos" 
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select 
              name="category" 
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm bg-white"
            >
              <option value="Tech">Tech & Gadgets</option>
              <option value="Fashion">Fashion & Thrift</option>
              <option value="Home">Home & Kitchen</option>
              <option value="Services">Services & Software</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Discounted Price (₦)</label>
            <input 
              name="dealPrice" 
              type="number" 
              required 
              placeholder="150000" 
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
            <input 
              name="originalPrice" 
              type="number" 
              required 
              placeholder="220000" 
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Destination URL (WhatsApp, Store Site, or Chat Link)</label>
          <input 
            name="dealUrl" 
            type="url" 
            required 
            placeholder="https://wa.me/2348000000000 or https://yourstore.com/item" 
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input 
            name="isEscrow" 
            type="checkbox" 
            id="isEscrow" 
            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="isEscrow" className="text-sm font-medium text-gray-700">
            Enable Paystack Escrow Protection for this deal
          </label>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-black text-white font-bold py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 text-sm shadow-sm"
      >
        {loading ? 'Publishing Deal...' : 'Publish Deal & Generate Social Copy'}
      </button>
    </form>
  );
}