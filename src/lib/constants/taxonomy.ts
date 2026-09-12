// lib/constants/taxonomy.ts

export interface GeoLocation {
  slug: string;
  name: string;
  type: 'state' | 'fct' | 'district';
  state?: string;
  region: 'North Central' | 'North East' | 'North West' | 'South East' | 'South South' | 'South West';
  geo: {
    latitude: number;
    longitude: number;
  };
}

export interface AssetCategory {
  slug: string;
  name: string;
  assetClass: 'digital' | 'physical' | 'service';
  defaultAvgPrice: number;
  description: string;
}

export const NIGERIAN_LOCATIONS: GeoLocation[] = [
  // FCT & Top Commercial Hubs
  { slug: 'abuja', name: 'Abuja (FCT)', type: 'fct', region: 'North Central', geo: { latitude: 9.0765, longitude: 7.3986 } },
  { slug: 'lagos', name: 'Lagos', type: 'state', region: 'South West', geo: { latitude: 6.5244, longitude: 3.3792 } },
  { slug: 'ikeja', name: 'Ikeja (Computer Village)', type: 'district', state: 'Lagos', region: 'South West', geo: { latitude: 6.5954, longitude: 3.3444 } },
  { slug: 'lekki', name: 'Lekki / Victoria Island', type: 'district', state: 'Lagos', region: 'South West', geo: { latitude: 6.4474, longitude: 3.4737 } },
  { slug: 'yaba', name: 'Yaba (Tech Valley)', type: 'district', state: 'Lagos', region: 'South West', geo: { latitude: 6.5165, longitude: 3.3858 } },
  { slug: 'wuse-garki', name: 'Wuse & Garki', type: 'district', state: 'Abuja', region: 'North Central', geo: { latitude: 9.0607, longitude: 7.4722 } },
  { slug: 'port-harcourt', name: 'Port Harcourt', type: 'state', region: 'South South', geo: { latitude: 4.8156, longitude: 7.0498 } },
  { slug: 'ibadan', name: 'Ibadan', type: 'state', region: 'South West', geo: { latitude: 7.3775, longitude: 3.9470 } },
  { slug: 'kano', name: 'Kano', type: 'state', region: 'North West', geo: { latitude: 12.0022, longitude: 8.5920 } },
  { slug: 'enugu', name: 'Enugu', type: 'state', region: 'South East', geo: { latitude: 6.4483, longitude: 7.5139 } },
  { slug: 'aba', name: 'Aba / Umuahia', type: 'state', region: 'South East', geo: { latitude: 5.1066, longitude: 7.3667 } },
  { slug: 'onitsha-awka', name: 'Onitsha & Awka', type: 'state', region: 'South East', geo: { latitude: 6.1511, longitude: 6.7850 } },
  { slug: 'benin-city', name: 'Benin City', type: 'state', region: 'South South', geo: { latitude: 6.3350, longitude: 5.6037 } },
  { slug: 'warri', name: 'Warri / Asaba', type: 'state', region: 'South South', geo: { latitude: 5.5167, longitude: 5.7500 } },
  { slug: 'abeokuta', name: 'Abeokuta', type: 'state', region: 'South West', geo: { latitude: 7.1557, longitude: 3.3450 } },
  { slug: 'kaduna', name: 'Kaduna', type: 'state', region: 'North West', geo: { latitude: 10.5105, longitude: 7.4165 } },
  { slug: 'calabar-uyo', name: 'Calabar & Uyo', type: 'state', region: 'South South', geo: { latitude: 4.9757, longitude: 8.3417 } },
  { slug: 'jos', name: 'Jos', type: 'state', region: 'North Central', geo: { latitude: 9.8965, longitude: 8.8583 } },
  { slug: 'ilorin', name: 'Ilorin', type: 'state', region: 'North Central', geo: { latitude: 8.4799, longitude: 4.5418 } },
  { slug: 'akure', name: 'Akure', type: 'state', region: 'South West', geo: { latitude: 7.2571, longitude: 5.2058 } },
  { slug: 'osogbo', name: 'Osogbo', type: 'state', region: 'South West', geo: { latitude: 7.7827, longitude: 4.5418 } },
  { slug: 'sokoto', name: 'Sokoto', type: 'state', region: 'North West', geo: { latitude: 13.0059, longitude: 5.2476 } },
  { slug: 'maiduguri', name: 'Maiduguri', type: 'state', region: 'North East', geo: { latitude: 11.8311, longitude: 13.1510 } },
  { slug: 'zaria', name: 'Zaria', type: 'district', state: 'Kaduna', region: 'North West', geo: { latitude: 11.0855, longitude: 7.7199 } },
  { slug: 'lokoja', name: 'Lokoja', type: 'state', region: 'North Central', geo: { latitude: 7.7969, longitude: 6.7405 } },
  { slug: 'minna', name: 'Minna', type: 'state', region: 'North Central', geo: { latitude: 9.6139, longitude: 6.5569 } },
  { slug: 'makurdi', name: 'Makurdi', type: 'state', region: 'North Central', geo: { latitude: 7.7327, longitude: 8.5214 } },
  { slug: 'lafia', name: 'Lafia', type: 'state', region: 'North Central', geo: { latitude: 8.4932, longitude: 8.5153 } },
  { slug: 'bauchi', name: 'Bauchi', type: 'state', region: 'North East', geo: { latitude: 10.3158, longitude: 9.8442 } },
  { slug: 'gombe', name: 'Gombe', type: 'state', region: 'North East', geo: { latitude: 10.2897, longitude: 11.1673 } },
  { slug: 'yola', name: 'Yola', type: 'state', region: 'North East', geo: { latitude: 9.2004, longitude: 12.4957 } },
  { slug: 'jalingo', name: 'Jalingo', type: 'state', region: 'North East', geo: { latitude: 8.8937, longitude: 11.3596 } },
  { slug: 'damaturu', name: 'Damaturu', type: 'state', region: 'North East', geo: { latitude: 11.7470, longitude: 11.9608 } },
  { slug: 'katsina', name: 'Katsina', type: 'state', region: 'North West', geo: { latitude: 12.9908, longitude: 7.6018 } },
  { slug: 'gusau', name: 'Gusau', type: 'state', region: 'North West', geo: { latitude: 12.1628, longitude: 6.6614 } },
  { slug: 'birnin-kebbi', name: 'Birnin Kebbi', type: 'state', region: 'North West', geo: { latitude: 12.4539, longitude: 4.1975 } },
  { slug: 'dutse', name: 'Dutse', type: 'state', region: 'North West', geo: { latitude: 11.7594, longitude: 9.3392 } },
  { slug: 'abakaliki', name: 'Abakaliki', type: 'state', region: 'South East', geo: { latitude: 6.3249, longitude: 8.1137 } },
  { slug: 'yenagoa', name: 'Yenagoa', type: 'state', region: 'South South', geo: { latitude: 4.9267, longitude: 6.2676 } },
  { slug: 'ado-ekiti', name: 'Ado-Ekiti', type: 'state', region: 'South West', geo: { latitude: 7.6211, longitude: 5.2214 } }
];

export const ASSET_CATEGORIES: AssetCategory[] = [
  // High-Ticket Digital Assets
  { slug: 'saas-startups', name: 'SaaS Startups & Micro-Apps', assetClass: 'digital', defaultAvgPrice: 8500000, description: 'Profitable software companies, ARR-verified micro-SaaS, and pre-seed digital products.' },
  { slug: 'tiktok-accounts', name: 'Monetized TikTok Accounts', assetClass: 'digital', defaultAvgPrice: 450000, description: 'Creator rewards-enabled, live-stream verified TikTok profiles with organic engagement.' },
  { slug: 'instagram-pages', name: 'Instagram Creator Pages', assetClass: 'digital', defaultAvgPrice: 650000, description: 'High-follower niche Instagram business assets with verified OG email transfer.' },
  { slug: 'youtube-channels', name: 'Monetized YouTube Channels', assetClass: 'digital', defaultAvgPrice: 1200000, description: 'YPP-approved channels with active AdSense payout history and strike-free standing.' },
  { slug: 'premium-domains', name: 'Premium .ng & Global Domains', assetClass: 'digital', defaultAvgPrice: 950000, description: 'Short, memorable, brandable digital real estate with high search authority.' },
  { slug: 'mobile-apps', name: 'iOS & Android App Codebases', assetClass: 'digital', defaultAvgPrice: 4500000, description: 'Production-ready mobile applications with full repository transfer.' },

  // High-Velocity Physical Tech & Gadgets
  { slug: 'iphones', name: 'Verified Apple iPhones', assetClass: 'physical', defaultAvgPrice: 650000, description: 'Factory unlocked, battery-health verified iPhones with 48-hour return escrow lock.' },
  { slug: 'macbooks', name: 'Apple MacBooks (M1/M2/M3/Pro)', assetClass: 'physical', defaultAvgPrice: 1100000, description: 'iCloud-unlocked, diagnostic-tested Apple Silicon laptops and developer workstations.' },
  { slug: 'windows-laptops', name: 'High-End Developer & Gaming Laptops', assetClass: 'physical', defaultAvgPrice: 850000, description: 'Dell XPS, ThinkPad, HP Omen, and ASUS ROG performance laptops.' },
  { slug: 'gaming-consoles', name: 'PlayStation 5 & Xbox Series X', assetClass: 'physical', defaultAvgPrice: 750000, description: 'Verified disc and digital gaming consoles with authentic accessories.' },
  { slug: 'cameras-gear', name: 'Cinema & Studio Camera Gear', assetClass: 'physical', defaultAvgPrice: 1400000, description: 'Sony Alpha, Blackmagic, and Canon mirrorless production kits.' },
];