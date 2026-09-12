import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server'; // FIX: Changed import
import DealGrid from '@/components/deals/DealGrid';

type Props = {
  params: { city: string; category: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // ... (metadata generation stays exactly the same)
  const city = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  const category = params.category.charAt(0).toUpperCase() + params.category.slice(1);

  return {
    title: `Best ${category} Deals & Discounts in ${city} | SlashDeals`,
    description: `Find the top active ${category} promos, awoof, and discount codes in ${city}, Nigeria today. Updated daily.`,
  };
}

export default async function LocalizedDealsPage({ params }: Props) {
  const supabase = await createClient(); // FIX: Initialize client here

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('category', params.category)
    .ilike('location', `%${params.city}%`)
    .eq('is_approved', true)
    .order('upvotes_count', { ascending: false });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        Top {params.category} Deals in <span className="capitalize">{params.city}</span>
      </h1>
      <p className="text-gray-600 mb-8">Live, verified discounts updated today.</p>
      
      {/* Assuming DealGrid accepts this shape */}
      <DealGrid deals={deals || []} /> 
    </main>
  );
}