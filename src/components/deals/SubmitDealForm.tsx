'use client';

import { useState } from 'react';
import { submitDealAction } from '@/app/actions/submit-deal';
import { DealFormData } from '@/lib/validations/deal';

export default function SubmitDealForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as unknown as DealFormData;

    const result = await submitDealAction(data);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Deal submitted successfully! Redirecting...' });
      setTimeout(() => {
        window.location.href = '/'; // Redirect to homepage to see the deal
      }, 1500);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm">
      {message && (
        <div className={`p-4 rounded-lg font-medium text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title *</label>
        <input name="title" required placeholder="e.g., 50% Off Samsung S23 Ultra" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Deal Price (₦) *</label>
          <input name="deal_price" type="number" required placeholder="e.g., 450000" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
          <input name="original_price" type="number" placeholder="e.g., 900000" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Category *</label>
          <select name="category" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="tech">Tech & Gadgets</option>
            <option value="fashion">Fashion & Style</option>
            <option value="food">Food & Restaurants</option>
            <option value="groceries">Groceries</option>
            <option value="travel">Travel & Rides</option>
            <option value="finance">Finance & FinTech</option>
            <option value="education">Education & Courses</option>
            <option value="services">Services</option>
            <option value="general">General</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Location *</label>
          <input name="location" required defaultValue="National" placeholder="e.g., Lagos, Abuja, or National" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Link to Deal *</label>
        <input name="deal_url" type="url" required placeholder="https://..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-1">Discount/Promo Code (Optional)</label>
          <input name="discount_code" placeholder="e.g., AWOOF20" className="w-full px-4 py-2 border rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Short Description</label>
        <textarea name="description" rows={3} placeholder="Any specific details? (Max 500 chars)" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-black text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-70"
      >
        {loading ? 'Submitting...' : 'Post Deal to Feed'}
      </button>
    </form>
  );
}