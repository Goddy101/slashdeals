// src/components/merchant/FlyerStudioTrigger.tsx
'use client';

import { useState } from 'react';
// Updated to target your specific folder structure using the absolute alias
import { FlyerStudioModal } from '@/components/merchant/FlyerStudioModal'; 

export default function FlyerStudioTrigger({ dealId }: { dealId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-bold bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-700 py-2 px-3 rounded-lg transition-colors flex items-center gap-1"
        title="Generate Marketing Asset"
      >
        <span>🎨</span> Flyer
      </button>

      <FlyerStudioModal 
        dealId={dealId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}