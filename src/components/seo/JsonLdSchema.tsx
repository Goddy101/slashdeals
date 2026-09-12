// src/components/JsonLdSchema.tsx
export default function JsonLdSchema({ deal }: { deal: any }) {
  if (!deal) return null;

  // Map your database row to the official Schema.org Offer format
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": deal.title,
    // 🚀 FIX 1: Provide the image array (Google requires this for Rich Snippets)
    "image": deal.image_url ? [deal.image_url] : [],
    "description": deal.description,
    "offers": {
      "@type": "Offer",
      // 🚀 FIX 2: Fixed domain to match your sitemap (.ng)
      "url": `https://slashdeals.com.ng/deal/${deal.id}`,
      "priceCurrency": "NGN",
      "price": deal.deal_price || 0,
      // Google likes a valid date. If none exists, default to 30 days from now
      "priceValidUntil": deal.pinned_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // 🚀 FIX 3: Make condition dynamic (fallback to New if not specified)
      "itemCondition": deal.condition === 'used' 
        ? "https://schema.org/UsedCondition" 
        : "https://schema.org/NewCondition",
        
      // If an item is escrow_locked, tell Google it's out of stock so buyers don't get mad
      "availability": deal.status === 'active' 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": deal.profiles?.business_name || "Verified Merchant"
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}