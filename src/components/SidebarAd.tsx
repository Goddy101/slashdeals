// src/components/SidebarAd.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface SidebarAdProps {
  category: string;
  dealOwnerId: string;
}

export default function SidebarAd({ category, dealOwnerId }: SidebarAdProps) {
  const [adCampaign, setAdCampaign] = useState<any>(null);
  const [isProtected, setIsProtected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdLogic() {
   //   const supabase = createClient();

      const supabase = await createClient();
      
      // 1. RULE C: Check for Competitor Ad Protection (Premium Subscription)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('merchant_id', dealOwnerId)
        .eq('status', 'active')
        .eq('plan_type', 'premium_merchant')
        .single();

      if (subscription) {
        setIsProtected(true);
        setLoading(false);
        return; // Stop here, render nothing.
      }

      // 2. Look for an active Category Monopoly for this specific category
      const { data: campaign } = await supabase
        .from('ad_campaigns')
        .select('id, headline, image_url, linked_deal_id')
        .eq('category', category)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (campaign) {
        setAdCampaign(campaign);
      }
      
      setLoading(false);
    }

    fetchAdLogic();
  }, [category, dealOwnerId]);

  // Loading skeleton so the layout doesn't jump
  if (loading) {
    return <div className="w-full h-64 bg-gray-200 animate-pulse rounded-2xl"></div>;
  }

  // 🛡️ The merchant paid for protection. Render nothing.
  if (isProtected) return null;

  // 3. FALLBACK: If no one has bought this category yet, show a House Ad to sell the slot!
  if (!adCampaign) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
        <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest mb-3 inline-block">
          Ad Space Available
        </span>
        <h4 className="font-black text-gray-900 mb-2 text-lg leading-tight">
          Dominate the {category.charAt(0).toUpperCase() + category.slice(1)} Category
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          Lock out competitors and show your product on every page in this category. Only 1 slot available.
        </p>
        <Link 
          href="/merchant/advertise" 
          className="bg-black text-white px-4 py-2.5 rounded-lg text-sm font-bold block w-full hover:bg-gray-800 transition-colors shadow-md"
        >
          Claim this Slot 🚀
        </Link>
      </div>
    );
  }

  // 4. RENDER THE LIVE AD
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm group hover:shadow-xl hover:border-gray-200 transition-all duration-300">
      {/* Top Label */}
      <div className="bg-gray-900 text-white text-[10px] font-black uppercase px-4 py-1.5 tracking-widest flex justify-between items-center">
        <span>Sponsored</span>
        <span className="text-gray-400">Monopoly</span>
      </div>

      {/* The Ad Itself - Notice we append ?ref=ad so we can track clicks later! */}
      <Link href={`/deal/${adCampaign.linked_deal_id}?ref=ad_${adCampaign.id}`} className="block relative">
        <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
           <img 
             src={adCampaign.image_url} 
             alt={adCampaign.headline}
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
           />
        </div>
        
        <div className="p-5 bg-white border-t border-gray-100">
          <h4 className="font-black text-gray-900 text-lg leading-tight mb-4">
            {adCampaign.headline}
          </h4>
          <div className="w-full bg-blue-600 text-white text-sm font-bold py-3 rounded-xl text-center group-hover:bg-blue-700 transition-colors shadow-md">
            View Deal →
          </div>
        </div>
      </Link>
    </div>
  );
}