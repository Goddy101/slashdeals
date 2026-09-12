// src/components/SellerBadge.tsx
'use client';

interface Props {
  successfulSales: number;
  hasCategoryMonopoly?: boolean; // True if they bought the AdTech
}

export function SellerBadge({ successfulSales, hasCategoryMonopoly = false }: Props) {
  const isPro = successfulSales >= 3;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* BASE TIER BADGE */}
      {isPro ? (
        <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
          <span className="text-sm">⭐</span> Pro Merchant
        </span>
      ) : (
        <span className="flex items-center gap-1 bg-zinc-100 text-zinc-600 border border-zinc-200 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
          <span className="text-sm">🌱</span> Level 1 Seller
        </span>
      )}

      {/* ESCROW STAT */}
      <span className="text-[11px] font-medium text-zinc-500">
        {successfulSales} successful {successfulSales === 1 ? 'sale' : 'sales'}
      </span>

      {/* ADTECH BADGE (If applicable) */}
      {hasCategoryMonopoly && (
        <span className="flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider shadow-sm ml-2">
          <span className="text-sm">👑</span> Category Sponsor
        </span>
      )}
    </div>
  );
}