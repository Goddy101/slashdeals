// components/FlyerGeneratorModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  dealId: string;
  dealTitle: string;
  currentBalance: number;
}

export default function FlyerGeneratorModal({ dealId, dealTitle, currentBalance }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'story' | 'square' | 'banner'>('story');
  const [template, setTemplate] = useState<'flash' | 'luxury' | 'minimal'>('luxury');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamically generate the preview URL based on state
  const previewUrl = `/api/og/flyer?deal_id=${dealId}&format=${format}&template=${template}`;

  const handlePurchaseAndDownload = async () => {
    const cost = 300; // ₦300 Micro-transaction

    if (currentBalance < cost) {
      alert(`Insufficient funds. You need ₦${cost} in your wallet to download premium assets.`);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Charge the merchant's wallet (We will write this API route next)
      const res = await fetch('/api/flyer/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, format, template, cost }),
      });

      const data = await res.json();

      if (data.success) {
        // 2. Trigger the actual browser download of the image
        const imageRes = await fetch(previewUrl);
        const imageBlob = await imageRes.blob();
        const downloadUrl = window.URL.createObjectURL(imageBlob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `SlashDeals_${template}_${format}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('Payment successful! Your premium flyer is downloading.');
        setIsOpen(false);
        router.refresh(); // Update the wallet balance on the dashboard
      } else {
        alert(data.error || 'Transaction failed');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
    
    setIsProcessing(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-600 hover:text-white font-bold px-3 py-1.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-1"
      >
        <span>📸</span> Get Flyer
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative flex flex-col md:flex-row gap-8 max-h-[90vh] overflow-y-auto">
            
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black z-10">✖</button>
            
            {/* Left Column: Configuration */}
            <div className="md:w-1/2 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Brand Asset Studio</h2>
                <p className="text-gray-500 text-sm font-medium">Turn your listing into a viral, high-converting social media graphic instantly.</p>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1. Choose Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'story', label: 'Story (9:16)', icon: '📱' },
                    { id: 'square', label: 'Post (1:1)', icon: '🟩' },
                    { id: 'banner', label: 'Banner (16:9)', icon: '🖥️' }
                  ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setFormat(f.id as any)}
                      className={`p-3 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all ${format === f.id ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <span className="text-xl">{f.icon}</span>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">2. Choose Theme</label>
                <div className="space-y-2">
                  {[
                    { id: 'luxury', name: 'Dark Luxury', desc: 'Best for High-Ticket Laptops & MacBooks' },
                    { id: 'minimal', name: 'Clean Minimal', desc: 'Best for Startups & Digital Assets' },
                    { id: 'flash', name: 'Flash Sale', desc: 'Best for massive discounts & urgency' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setTemplate(t.id as any)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${template === t.id ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className={`font-bold ${template === t.id ? 'text-fuchsia-700' : 'text-gray-900'}`}>{t.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={handlePurchaseAndDownload}
                  disabled={isProcessing}
                  className="w-full bg-zinc-900 text-white font-black text-lg py-4 rounded-2xl hover:bg-black transition-all hover:-translate-y-1 disabled:opacity-50 flex items-center justify-between px-6"
                >
                  <span>{isProcessing ? 'Processing...' : 'Download High-Res'}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">₦300</span>
                </button>
                <p className="text-center text-xs text-gray-400 font-bold mt-3">Balance: ₦{currentBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Right Column: Live Preview Area */}
            <div className="md:w-1/2 bg-gray-100 rounded-2xl p-6 flex items-center justify-center border border-gray-200 relative">
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                LIVE PREVIEW
              </div>
              
              {/* Dynamic Aspect Ratio Container */}
              <div 
                className="relative overflow-hidden shadow-2xl transition-all duration-500"
                style={{ 
                  aspectRatio: format === 'story' ? '9/16' : format === 'square' ? '1/1' : '16/9',
                  width: format === 'story' ? '280px' : '100%',
                  maxHeight: '500px'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  key={previewUrl} 
                  src={previewUrl} 
                  alt="Flyer Preview" 
                  className="w-full h-full object-contain bg-white"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}