// src/app/merchant/bids/page.tsx
import Link from 'next/link';

export default function MerchantBidsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-white rounded-[32px] p-12 text-center border border-gray-200 shadow-sm">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          🔨
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Ad Arena Bidding</h1>
        <p className="text-gray-500 font-medium max-w-lg mx-auto mb-8">
          The Ad Arena is currently being upgraded. Soon you will be able to lock funds here to bid on Category Monopolies and Platform Takeovers.
        </p>
        <Link 
          href="/merchant/dashboard" 
          className="inline-block bg-black text-white font-bold px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}