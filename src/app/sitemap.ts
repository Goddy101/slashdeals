// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { NIGERIAN_LOCATIONS, ASSET_CATEGORIES } from '@/lib/constants/taxonomy';

const BASE_URL = process.env.NEXT_SITE_URL || 'https://slashdeals.com.ng';

// Initialize Admin Supabase to bypass RLS for sitemap generation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateSitemaps() {
  return [
    { id: 0 }, // Core Pages, South West & Lagos (Highest Priority)
    { id: 1 }, // North Central & Abuja
    { id: 2 }, // South South
    { id: 3 }, // South East
    { id: 4 }, // North West
    { id: 5 }, // North East
  ];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const regions = ['South West', 'North Central', 'South South', 'South East', 'North West', 'North East'] as const;
  const currentRegion = regions[id] || 'South West';
  const locationsInRegion = NIGERIAN_LOCATIONS.filter((loc) => loc.region === currentRegion);
  const entries: MetadataRoute.Sitemap = [];

  // 1. Core Static Pages (Only injected on partition 0 to prevent duplication)
  if (id === 0) {
    const staticPages = ['', '/explore', '/how-escrow-works', '/faq', '/merchant/post', '/due-diligence'];
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  const { data: digitalDeals } = await supabaseAdmin
      .from('deals')
      .select('id, updated_at')
      .eq('status', 'active')
      .in('location', ['online', 'national', 'remote']); 

    if (digitalDeals) {
      for (const deal of digitalDeals) {
        entries.push({
          url: `${BASE_URL}/deal/${deal.id}`,
          lastModified: new Date(deal.updated_at || new Date()),
          changeFrequency: 'daily',
          priority: 0.8, // High priority for high-ticket digital assets
        });
      }
    }

  // 2. Programmatic Regional Matrix (e.g. /explore/lagos/smartphones)
  for (const location of locationsInRegion) {
    for (const category of ASSET_CATEGORIES) {
      entries.push({
        url: `${BASE_URL}/explore/${location.slug}/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: (location.slug === 'lagos' || location.slug === 'abuja') ? 0.9 : 0.7,
      });
    }
  }

  // 3. Dynamic Long-Tail Deal Injection (Individual Product Pages)
  // Fetch active deals matching the locations in this partition
  const locationSlugs = locationsInRegion.map(l => l.slug);
  
  if (locationSlugs.length > 0) {
    const { data: activeDeals } = await supabaseAdmin
      .from('deals')
      .select('id, updated_at')
      .eq('status', 'active')
      .in('location', locationSlugs)
      .limit(2000); // Prevent Vercel function timeout limits

    if (activeDeals) {
      for (const deal of activeDeals) {
        entries.push({
          url: `${BASE_URL}/deal/${deal.id}`,
          lastModified: new Date(deal.updated_at || new Date()),
          changeFrequency: 'daily',
          priority: 0.6, // Products change frequently, but category pages hold primary authority
        });
      }
    }
  }

  return entries;
}




