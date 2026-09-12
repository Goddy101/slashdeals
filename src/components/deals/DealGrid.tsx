import DealCard from './DealCard';

interface Deal {
  id: string;
  title: string;
  original_price: number;
  deal_price: number;
  upvotes_count: number;
  is_escrow_enabled: boolean;
  profiles?: {
    business_name?: string;
  } | {
    business_name?: string;
  }[];
}

interface DealGridProps {
  deals: Deal[];
}

export default function DealGrid({ deals }: DealGridProps) {
  if (!deals || deals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-gray-500 font-medium">No deals found right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {deals.map((deal) => {
        // Safely extract merchant name from join
        const profile = Array.isArray(deal.profiles) ? deal.profiles[0] : deal.profiles;
        const merchantName = profile?.business_name || 'Verified Merchant';

        return (
          <DealCard 
            key={deal.id}
            id={deal.id}
            title={deal.title}
            merchantName={merchantName}
            originalPrice={deal.original_price}
            dealPrice={deal.deal_price}
            upvotesCount={deal.upvotes_count}
            isEscrow={deal.is_escrow_enabled}
          />
        );
      })}
    </div>
  );
}