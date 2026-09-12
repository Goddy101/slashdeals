// app/explore/[location]/[category]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: Promise<{ location: string; category: string }>;
}

// 1. Dynamic Metadata generation for SEO & Social Crawlers
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, category } = await params;
  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  const formattedCategory = category.replace('-', ' ').toUpperCase();

  const title = `Buy & Sell Verified ${formattedCategory} in ${formattedLocation} | SlashDeals`;
  const description = `Secure 48-hour escrow protection for ${formattedCategory} transactions in ${formattedLocation}. Verified listings with instant digital and physical handover.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://slashdeal.ng/explore/${location}/${category}`,
    },
    openGraph: {
      title,
      description,
      url: `https://slashdeal.ng/explore/${location}/${category}`,
      type: 'website',
    },
  };
}

// Client Sub-Component for handling tracking clicks on listing cards
function ListingCard({ item }: { item: any }) {
  const handleClick = () => {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: item.id, eventType: 'click' }),
    }).catch(() => {});
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <span className="text-xs font-semibold px-3 py-1 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
          🛡️ Escrow Protected
        </span>
        <h2 className="text-xl font-bold text-white mt-4">{item.title}</h2>
        <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{item.description}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-2xl font-black text-white">₦{item.price.toLocaleString()}</span>
        <Link 
          href={`/vault/${item.id}`} 
          onClick={handleClick}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl transition-all"
        >
          Secure Deal
        </Link>
      </div>
    </div>
  );
}

// 2. Main Page Component (Server-Side Rendered for Maximum Indexing Speed)
export default async function ProgrammaticLandingPage({ params }: Props) {
  const { location, category } = await params;

  // Fetch live listings matching this specific GEO and category matrix
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('location', location.toLowerCase())
    .eq('category', category.toLowerCase())
    .eq('status', 'active');

  if (error || !listings) {
    notFound();
  }

  // Calculate dynamic aggregate data for rich content injection (Solves "thin content" penalty)
  const averagePrice = listings.length > 0 
    ? Math.round(listings.reduce((acc, item) => acc + item.price, 0) / listings.length) 
    : 0;

  // 3. JSON-LD Structured Data for AEO / GEO (ChatGPT, Perplexity, Google AI Overviews)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Verified ${category} for sale in ${location}`,
    description: `Secure marketplace listings for ${category} in ${location} backed by SlashDeals 48-hour escrow.`,
    numberOfItems: listings.length,
    itemListElement: listings.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.title,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'NGN',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      {/* Inject JSON-LD Structured Data directly into the HTML stream */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation Schema Mapping */}
      <nav className="text-sm text-zinc-400 mb-6">
        <span>Home</span> / <span>Explore</span> / <span className="text-white capitalize">{location}</span> / <span className="text-emerald-400 capitalize">{category.replace('-', ' ')}</span>
      </nav>

      {/* Dynamic Header */}
      <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
        Verified {category.replace('-', ' ')} in <span className="text-emerald-400 capitalize">{location}</span>
      </h1>
      
      <p className="text-zinc-300 max-w-2xl text-lg mb-8">
        Browse active listings secured by our 48-hour escrow vault. Current market average in {location} is <strong className="text-white">₦{averagePrice.toLocaleString()}</strong> with zero-risk payout protection.
      </p>

      {/* Marketplace Grid Feed with Telemetry Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {listings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-zinc-400 text-lg">No active listings in this region right now.</p>
          <a href="/list" className="mt-4 inline-block text-emerald-400 font-semibold underline">Be the first vendor to list an asset here →</a>
        </div>
      )}
    </main>
  );
}








// // app/explore/[location]/[category]/page.tsx
// import { Metadata } from 'next';
// import { notFound } from 'next/navigation';
// import { createClient } from '@supabase/supabase-js';

// // Initialize Supabase Client
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// interface Props {
//   params: Promise<{ location: string; category: string }>;
// }

// // 1. Dynamic Metadata generation for SEO & Social Crawlers
// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   const { location, category } = await params;
//   const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
//   const formattedCategory = category.replace('-', ' ').toUpperCase();

//   const title = `Buy & Sell Verified ${formattedCategory} in ${formattedLocation} | SlashDeals`;
//   const description = `Secure 48-hour escrow protection for ${formattedCategory} transactions in ${formattedLocation}. Verified listings with instant digital and physical handover.`;

//   return {
//     title,
//     description,
//     alternates: {
//       canonical: `https://slashdeal.ng/explore/${location}/${category}`,
//     },
//     openGraph: {
//       title,
//       description,
//       url: `https://slashdeal.ng/explore/${location}/${category}`,
//       type: 'website',
//     },
//   };
// }

// // 2. Main Page Component (Server-Side Rendered for Maximum Indexing Speed)
// export default async function ProgrammaticLandingPage({ params }: Props) {
//   const { location, category } = await params;

//   // Fetch live listings matching this specific GEO and category matrix
//   const { data: listings, error } = await supabase
//     .from('listings')
//     .select('*')
//     .eq('location', location.toLowerCase())
//     .eq('category', category.toLowerCase())
//     .eq('status', 'active');

//   if (error || !listings) {
//     notFound();
//   }

//   // Calculate dynamic aggregate data for rich content injection (Solves "thin content" penalty)
//   const averagePrice = listings.length > 0 
//     ? Math.round(listings.reduce((acc, item) => acc + item.price, 0) / listings.length) 
//     : 0;

//   // 3. JSON-LD Structured Data for AEO / GEO (ChatGPT, Perplexity, Google AI Overviews)
//   const jsonLd = {
//     '@context': 'https://schema.org',
//     '@type': 'ItemList',
//     name: `Verified ${category} for sale in ${location}`,
//     description: `Secure marketplace listings for ${category} in ${location} backed by SlashDeals 48-hour escrow.`,
//     numberOfItems: listings.length,
//     itemListElement: listings.map((item, index) => ({
//       '@type': 'ListItem',
//       position: index + 1,
//       item: {
//         '@type': 'Product',
//         name: item.title,
//         description: item.description,
//         offers: {
//           '@type': 'Offer',
//           price: item.price,
//           priceCurrency: 'NGN',
//           availability: 'https://schema.org/InStock',
//         },
//       },
//     })),
//   };

//   return (
//     <main className="max-w-7xl mx-auto px-4 py-12">
//       {/* Inject JSON-LD Structured Data directly into the HTML stream */}
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
//       />

//       {/* Breadcrumb Navigation Schema Mapping */}
//       <nav className="text-sm text-zinc-400 mb-6">
//         <span>Home</span> / <span>Explore</span> / <span className="text-white capitalize">{location}</span> / <span className="text-emerald-400 capitalize">{category.replace('-', ' ')}</span>
//       </nav>

//       {/* Dynamic Header */}
//       <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
//         Verified {category.replace('-', ' ')} in <span className="text-emerald-400 capitalize">{location}</span>
//       </h1>
      
//       <p className="text-zinc-300 max-w-2xl text-lg mb-8">
//         Browse active listings secured by our 48-hour escrow vault. Current market average in {location} is <strong className="text-white">₦{averagePrice.toLocaleString()}</strong> with zero-risk payout protection.
//       </p>

//       {/* Marketplace Grid Feed */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {listings.map((item) => (
//           <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
//             <div>
//               <span className="text-xs font-semibold px-3 py-1 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
//                 🛡️ Escrow Protected
//               </span>
//               <h2 className="text-xl font-bold text-white mt-4">{item.title}</h2>
//               <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{item.description}</p>
//             </div>
//             <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
//               <span className="text-2xl font-black text-white">₦{item.price.toLocaleString()}</span>
//               <a 
//                 href={`/vault/${item.id}`} 
//                 className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl transition-all"
//               >
//                 Secure Deal
//               </a>
//             </div>
//           </div>
//         ))}
//       </div>

//       {listings.length === 0 && (
//         <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
//           <p className="text-zinc-400 text-lg">No active listings in this region right now.</p>
//           <a href="/list" className="mt-4 inline-block text-emerald-400 font-semibold underline">Be the first vendor to list an asset here →</a>
//         </div>
//       )}
//     </main>
//   );
// }