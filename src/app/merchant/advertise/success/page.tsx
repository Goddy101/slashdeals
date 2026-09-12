// src/app/merchant/advertise/success/page.tsx
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');

  return (
    <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-3xl border border-gray-200 shadow-xl text-center">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
        🎉
      </div>
      
      <h1 className="text-3xl font-black text-gray-900 mb-4">Campaign Activated!</h1>
      
      <p className="text-lg text-gray-600 mb-8">
        Your payment was successful and your Category Monopoly is being provisioned. Your ad will begin displaying across your chosen category immediately.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 text-sm text-gray-500 font-mono">
        Transaction Reference: {reference || 'Processing...'}
      </div>

      <div className="flex gap-4 justify-center">
        <Link 
          href="/merchant/dashboard" 
          className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function AdvertiseSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold">Verifying Campaign...</div>}>
      <SuccessContent />
    </Suspense>
  );
}