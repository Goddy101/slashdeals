// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import { Metadata } from 'next';
import Link from 'next/link';

// Cache on Vercel CDN for 1 hour, revalidate in background
export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await supabase.from('blog_posts').select('*').eq('slug', slug).single();
  
  if (!post) return { title: 'Post Not Found | SlashDeals' };
  
  return {
    title: `${post.title} | SlashDeals Market Insights`,
    description: post.seo_description,
    openGraph: {
      title: post.title,
      description: post.seo_description,
      type: 'article',
      publishedTime: post.published_at || post.created_at,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!post) notFound();

  const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Google JSON-LD Structured Data for Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seo_description,
    datePublished: post.published_at || post.created_at,
    author: {
      '@type': 'Organization',
      name: 'SlashDeals Market Intelligence',
      url: process.env.NEXT_SITE_URL || 'https://slashdeals.com.ng',
    },
  };

  return (
    <>
      {/* Inject Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-16 text-zinc-200">
        
        {/* Header */}
        <div className="mb-8 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/blog" 
              className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              &larr; Back to Blog
            </Link>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-bold tracking-wider text-xs uppercase bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/50">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-6 mb-4 leading-tight">
            {post.title}
          </h1>

          <time className="text-zinc-500 text-sm font-medium">
            Published {formattedDate}
          </time>
        </div>

        {/* Markdown Engine Rendering with Custom Link Handler */}
        <div className="prose prose-invert prose-emerald lg:prose-lg max-w-none leading-relaxed">
          <ReactMarkdown
            components={{
              // Intercept links inside markdown content
              a: ({ href, children }) => {
                const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
                if (isInternal) {
                  return (
                    <Link href={href} className="text-emerald-400 font-bold hover:underline">
                      {children}
                    </Link>
                  );
                }
                return (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
        
        {/* Dynamic High-Converting CTA */}
        <div className="mt-16 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-2">Trade with Zero Risk</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Join thousands of merchants and buyers using SlashDeals 48-Hour Escrow for verified digital assets and tech deals.
          </p>
          <Link 
            href="/explore" 
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-8 py-3.5 rounded-xl transition-all shadow-lg hover:scale-105"
          >
            Explore Live Market &rarr;
          </Link>
        </div>

      </article>
    </>
  );
}