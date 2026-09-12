// app/page.tsx
import { createClient } from '@/lib/supabase/server';
import HomeFeedClient from './HomeFeedClient';

// Next.js 15 requires awaiting searchParams
export default async function HomePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const category = params.category || 'All';
  const sort = params.sort || 'trending';
  
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // 1. Fetch Takeover
  const { data: takeover } = await supabase
    .from('platform_takeovers')
    .select('*')
    .eq('target_date', today)
    .in('status', ['active', 'scheduled'])
    .single();

  // 2. Fetch Spotlights
  let spotlightQuery = supabase
    .from('deals')
    .select('*, profiles(business_name, is_verified)')
    .eq('status', 'active')
    .gt('spotlight_expires_at', now)
    .order('spotlight_expires_at', { ascending: false })
    .limit(5);
    
  if (category !== 'All') spotlightQuery = spotlightQuery.eq('category', category.toLowerCase());
  const { data: spotlights } = await spotlightQuery;

  // 3. Fetch Organic Feed (Page 1 - First 20 Deals)
  let feedQuery = supabase
    .from('deals')
    .select('*, profiles(business_name, is_verified)')
    .eq('status', 'active')
    .range(0, 19);

  if (category !== 'All') feedQuery = feedQuery.eq('category', category.toLowerCase());
  
  if (sort === 'trending') {
    feedQuery = feedQuery.order('bumped_at', { ascending: false, nullsFirst: false }).order('upvotes_count', { ascending: false });
  } else {
    feedQuery = feedQuery.order('created_at', { ascending: false });
  }
  
  const { data: feedDeals } = await feedQuery;

  // Render the Client component and pass the data as initial state!
  return (
    <HomeFeedClient 
      initialTakeover={takeover}
      initialSpotlights={spotlights || []}
      initialDeals={feedDeals || []}
      initialCategory={category}
      initialSort={sort as 'trending' | 'newest'}
    />
  );
}