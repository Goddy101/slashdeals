// app/merchant/post/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FlyerStudioModal } from '@/components/merchant/FlyerStudioModal';

export default function PostDealPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Guardrail States
  const [completedOrders, setCompletedOrders] = useState(0);
  const [forceEscrow, setForceEscrow] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [originalPrice, setOriginalPrice] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [isEscrowEnabled, setIsEscrowEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Image Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Viral Loop State
  const [publishedDealId, setPublishedDealId] = useState<string | null>(null);

  useEffect(() => {
    async function checkMerchantStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // GUARDRAIL 1: Count successful orders to determine if we lock Escrow
      const { count } = await supabase
        .from('escrows')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id) 
        .eq('status', 'completed');
      
      const successfulOrders = count || 0;
      setCompletedOrders(successfulOrders);
      
      if (successfulOrders < 3) {
        setForceEscrow(true);
        setIsEscrowEnabled(true);
      }
      setLoading(false);
    }
    checkMerchantStatus();
  }, [router, supabase]);

  // --- IMAGE HANDLING LOGIC ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Enforce max 4 images
      if (selectedFiles.length + newFiles.length > 4) {
        alert("You can only upload a maximum of 4 images.");
        return;
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);

      // Create preview URLs
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const uploadImagesToSupabase = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    
    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of selectedFiles) {
      // Create a unique file name to prevent overwrites
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `deals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deal-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload one or more images.');
      }

      // Get the public URL for the uploaded image
      const { data } = supabase.storage.from('deal-images').getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    setIsUploading(false);
    return uploadedUrls;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      alert("Please upload at least one image of the product.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload images first
      const imageUrls = await uploadImagesToSupabase();
      
      // We store the primary image in image_url (for backward compatibility), 
      // and all images in the JSON array 'images' (if your schema supports it)
      const primaryImageUrl = imageUrls[0];

      const origPrice = Number(originalPrice);
      const dPrice = Number(dealPrice);

      // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
      const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
      const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

      // 2. Insert the deal into the database
      const { data: newDeal, error } = await supabase.from('deals').insert([{
        user_id: userId,
        title,
        description,
        category,
        original_price: origPrice,
        deal_price: dPrice,
        is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
        status: dealStatus,
        image_url: primaryImageUrl, // The main cover image
        images: imageUrls           // Array of all uploaded images
      }]).select('id').single();

      if (error) throw error;

      // 3. --- TELEMETRY: LOG CREATION / PUBLISH EVENT ---
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: newDeal.id, eventType: 'publish' }), 
      }).catch(() => {});

      // 4. 🚀 TELEGRAM BROADCAST (Only if it's active and not pending review)
      if (dealStatus === 'active') {
        fetch('/api/telegram/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            price: dPrice,
            imageUrl: primaryImageUrl,
            dealId: newDeal.id,
            isFlashBump: false
          })
        }).catch((err) => console.error("Broadcast failed:", err));
      }

      if (dealStatus === 'pending_review') {
        alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
        router.push('/merchant/orders');
      } else {
        // VIRAL LOOP TRIGGER: Don't route away! Show the Flyer Studio.
        setPublishedDealId(newDeal.id);
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error posting deal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 font-bold text-center">Verifying account status...</div>;

  // --- VIRAL LOOP UI ---
  if (publishedDealId) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-green-50 text-green-800 p-8 rounded-3xl border border-green-200">
          <h2 className="text-3xl font-black mb-3">🎉 Deal is Live!</h2>
          <p className="text-lg">Your item is now protected by the SlashDeals Escrow Vault.</p>
        </div>
        
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm text-left">
          <h3 className="text-xl font-bold mb-2">Generate Your Marketing Flyer</h3>
          <p className="text-gray-500 mb-6">
            Buyers trust escrow. Download your custom flyer with the Escrow Trust badge and post it to your WhatsApp status to start getting sales immediately.
          </p>
          
          <FlyerStudioModal
            isOpen={true}
            dealId={publishedDealId}
            onClose={() => router.push('/merchant/orders')}
          />
        </div>
      </div>
    );
  }

  // --- DEFAULT POST DEAL FORM ---
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 font-sans">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Post a Physical Deal</h1>
      <p className="text-gray-500 font-medium mb-8">List gadgets, inventory, or real estate securely.</p>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: IMAGES */}
        <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-gray-200 shadow-sm">
           <label className="block text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-3 border-gray-100">
            1. Product Images
          </label>
          <p className="text-sm text-gray-500 mb-4">Upload up to 4 high-quality images. The first image will be the cover.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-black/60 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                {idx === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[10px] font-bold text-center py-1">
                    COVER
                  </div>
                )}
              </div>
            ))}
            
            {imagePreviews.length < 4 && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                <span className="text-2xl mb-1">+</span>
                <span className="text-xs font-bold">Add Image</span>
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            multiple 
            className="hidden" 
          />
        </div>

        {/* SECTION 2: DETAILS */}
        <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-gray-200 shadow-sm space-y-6">
          <label className="block text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-3 border-gray-100">
            2. Deal Details
          </label>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Deal Title</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all font-medium" placeholder="e.g., iPhone 15 Pro Max - 256GB" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none font-medium bg-white">
                <option value="Electronics">Electronics & Gadgets</option>
                <option value="Fashion">Fashion & Apparel</option>
                <option value="Home">Home & Furniture</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Automotive">Vehicles</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Original Price (₦)</label>
              <input required type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium font-mono" placeholder="Market Value" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Deal Price (₦)</label>
              <input required type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium font-mono text-emerald-700" placeholder="Your Selling Price" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description & Condition</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium resize-none" placeholder="Describe the item. Is it brand new in box? Used with minor scratches? Be honest to prevent escrow disputes."></textarea>
          </div>
        </div>

        {/* SECTION 3: SECURITY */}
        <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-gray-200 shadow-sm">
          <label className="block text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-3 border-gray-100">
            3. Security
          </label>
          
          <div className={`p-5 rounded-2xl border transition-colors ${forceEscrow ? 'bg-blue-50 border-blue-200' : isEscrowEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  🛡️ Escrow Protection
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-md leading-relaxed">
                  {forceEscrow 
                    ? 'Mandatory for new sellers to build buyer trust.' 
                    : 'Highly recommended. Buyers are 4x more likely to purchase when their funds are protected by Escrow.'}
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={forceEscrow ? true : isEscrowEnabled} 
                onChange={e => setIsEscrowEnabled(e.target.checked)}
                disabled={forceEscrow}
                className="w-6 h-6 rounded text-black focus:ring-black cursor-pointer disabled:opacity-50"
              />
            </div>
            {forceEscrow && (
              <div className="mt-4 text-xs font-bold text-blue-800 bg-blue-100/50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                <span>🔒</span> Locked until you complete 3 successful orders. ({completedOrders}/3 completed)
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting || isUploading} 
          className="w-full bg-black text-white font-black py-5 rounded-2xl text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1"
        >
          {isUploading ? 'Uploading Images...' : submitting ? 'Publishing Deal...' : 'Publish Deal'}
        </button>
        
      </form>
    </div>
  );
}
















// // app/merchant/post/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// // Ensure this path matches your folder structure
// import { FlyerStudioModal } from '@/components/merchant/FlyerStudioModal';

// export default function PostDealPage() {
//   const supabase = createClient();
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
  
//   // Guardrail States
//   const [completedOrders, setCompletedOrders] = useState(0);
//   const [forceEscrow, setForceEscrow] = useState(false);

//   // Form States
//   const [title, setTitle] = useState('');
//   const [originalPrice, setOriginalPrice] = useState('');
//   const [dealPrice, setDealPrice] = useState('');
//   const [isEscrowEnabled, setIsEscrowEnabled] = useState(true);
//   const [isPhysical, setIsPhysical] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   // Viral Loop State
//   const [publishedDealId, setPublishedDealId] = useState<string | null>(null);

//   useEffect(() => {
//     async function checkMerchantStatus() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.push('/login');
//         return;
//       }
//       setUserId(user.id);

//       // GUARDRAIL 1: Count successful orders to determine if we lock Escrow
//       const { count } = await supabase
//         .from('escrows')
//         .select('*', { count: 'exact', head: true })
//         .eq('seller_id', user.id) 
//         .eq('status', 'completed');
      
//       const successfulOrders = count || 0;
//       setCompletedOrders(successfulOrders);
      
//       if (successfulOrders < 3) {
//         setForceEscrow(true);
//         setIsEscrowEnabled(true);
//       }
//       setLoading(false);
//     }
//     checkMerchantStatus();
//   }, [router, supabase]);

//   // const handleSubmit = async (e: React.FormEvent) => {
//   //   e.preventDefault();
//   //   setSubmitting(true);

//   //   const origPrice = Number(originalPrice);
//   //   const dPrice = Number(dealPrice);

//   //   // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
//   //   const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
//   //   const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

//   //   const { data: newDeal, error } = await supabase.from('deals').insert([{
//   //     user_id: userId,
//   //     title,
//   //     original_price: origPrice,
//   //     deal_price: dPrice,
//   //     is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
//   //     // Note: Make sure 'is_physical' exists in your deals schema, 
//   //     // or map it to your category/asset_class field if needed.
//   //     status: dealStatus 
//   //   }]).select('id').single();

//   //   if (error || !newDeal) {
//   //     alert('Error posting deal');
//   //   } else {
//   //     // --- TELEMETRY: LOG CREATION / PUBLISH EVENT ---
//   //     fetch('/api/telemetry', {
//   //       method: 'POST',
//   //       headers: { 'Content-Type': 'application/json' },
//   //       body: JSON.stringify({ listingId: newDeal.id, eventType: 'view' }), 
//   //     }).catch(() => {});

//   //     if (dealStatus === 'pending_review') {
//   //       alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
//   //       router.push('/merchant/orders');
//   //     } else {
//   //       // VIRAL LOOP TRIGGER: Don't route away! Show the Flyer Studio.
//   //       setPublishedDealId(newDeal.id);
//   //     }
//   //   }
//   //   setSubmitting(false);
//   // };



//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);

//     const origPrice = Number(originalPrice);
//     const dPrice = Number(dealPrice);

//     // GUARDRAIL 2: The Price-Drop Anomaly Filter (60% Rule)
//     const discountPercentage = ((origPrice - dPrice) / origPrice) * 100;
//     const dealStatus = discountPercentage > 60 ? 'pending_review' : 'active';

//     // Ensure you have an image array, even if it's empty for now
//     const dummyImageArray = ['https://via.placeholder.com/800x800.png?text=SlashDeals'];

//     const { data: newDeal, error } = await supabase.from('deals').insert([{
//       user_id: userId,
//       title,
//       original_price: origPrice,
//       deal_price: dPrice,
//       is_escrow_enabled: forceEscrow ? true : isEscrowEnabled,
//       status: dealStatus,
//       images: dummyImageArray // Temporary until you add the image uploader here
//     }]).select('id').single();

//     if (error || !newDeal) {
//       alert('Error posting deal');
//     } else {
//       // --- TELEMETRY: LOG CREATION / PUBLISH EVENT ---
//       fetch('/api/telemetry', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ listingId: newDeal.id, eventType: 'view' }), 
//       }).catch(() => {});

//       // 🚀 TELEGRAM BROADCAST (Only if it's active and not pending review)
//       if (dealStatus === 'active') {
//         fetch('/api/telegram/broadcast', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             title: title,
//             price: dPrice,
//             imageUrl: dummyImageArray[0],
//             dealId: newDeal.id,
//             isFlashBump: false
//           })
//         }).catch((err) => console.error("Broadcast failed:", err));
//       }

//       if (dealStatus === 'pending_review') {
//         alert('Deal submitted! Because the discount is over 60%, our team will review it quickly to ensure quality. It will go live shortly.');
//         router.push('/merchant/orders');
//       } else {
//         // VIRAL LOOP TRIGGER: Don't route away! Show the Flyer Studio.
//         setPublishedDealId(newDeal.id);
//       }
//     }
//     setSubmitting(false);
//   };

//   if (loading) return <div className="p-10 font-bold">Verifying account status...</div>;

//   // --- VIRAL LOOP UI ---
//   // If a deal was successfully published, show the Success UI and Flyer Studio
//   if (publishedDealId) {
//     return (
//       <div className="max-w-3xl mx-auto p-4 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
//         <div className="bg-green-50 text-green-800 p-8 rounded-3xl border border-green-200">
//           <h2 className="text-3xl font-black mb-3">🎉 Deal is Live!</h2>
//           <p className="text-lg">Your item is now protected by the SlashDeals Escrow Vault.</p>
//         </div>
        
//         <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm text-left">
//           <h3 className="text-xl font-bold mb-2">Generate Your Marketing Flyer</h3>
//           <p className="text-gray-500 mb-6">
//             Buyers trust escrow. Download your custom flyer with the Escrow Trust badge and post it to your WhatsApp status to start getting sales immediately.
//           </p>
          
//           <FlyerStudioModal
//             isOpen={true}
//             dealId={publishedDealId}
//             onClose={() => router.push('/merchant/orders')}
//           />
//         </div>
//       </div>
//     );
//   }

//   // --- DEFAULT POST DEAL FORM ---
//   return (
//     <div className="max-w-3xl mx-auto p-4 sm:p-8">
//       <h1 className="text-3xl font-black text-gray-900 mb-6">Post a Deal</h1>
      
//       <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        
//         {/* Deal Info */}
//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Deal Title</label>
//           <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" placeholder="e.g., iPhone 15 Pro Max - 256GB" />
//         </div>

//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Original Price (₦)</label>
//             <input required type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" />
//           </div>
//           <div>
//             <label className="block text-sm font-bold text-gray-700 mb-1">Deal Price (₦)</label>
//             <input required type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black" />
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-bold text-gray-700 mb-1">Product Type</label>
//           <select value={isPhysical ? 'yes' : 'no'} onChange={e => setIsPhysical(e.target.value === 'yes')} className="w-full px-4 py-3 border rounded-xl focus:ring-black focus:border-black">
//             <option value="yes">Physical Item (Requires Delivery/Meetup)</option>
//             <option value="no">Digital / Service (Instant Transfer)</option>
//           </select>
//         </div>

//         {/* GUARDRAIL 1 UI: Escrow Enforcement */}
//         <div className={`p-5 rounded-2xl border ${forceEscrow ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="font-bold text-gray-900">🛡️ Escrow Protection</p>
//               <p className="text-sm text-gray-500 mt-1">
//                 {forceEscrow 
//                   ? 'Mandatory for new sellers to build buyer trust.' 
//                   : 'Highly recommended. Buyers trust Escrow deals 4x more.'}
//               </p>
//             </div>
//             <input 
//               type="checkbox" 
//               checked={forceEscrow ? true : isEscrowEnabled} 
//               onChange={e => setIsEscrowEnabled(e.target.checked)}
//               disabled={forceEscrow}
//               className="w-6 h-6 rounded text-black focus:ring-black cursor-pointer disabled:opacity-50"
//             />
//           </div>
//           {forceEscrow && (
//             <div className="mt-3 text-xs font-bold text-blue-800 bg-blue-100 p-2 rounded-lg inline-block">
//               🔒 Locked until you complete 3 successful orders. ({completedOrders}/3 completed)
//             </div>
//           )}
//         </div>

//         <button type="submit" disabled={submitting} className="w-full bg-black text-white font-black py-4 rounded-xl text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer">
//           {submitting ? 'Posting...' : 'Publish Deal'}
//         </button>
//       </form>
//     </div>
//   );
// }


