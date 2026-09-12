import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('deal_id');
    const format = searchParams.get('format') || 'story'; // story (9:16), square (1:1), banner (16:9)
    const template = searchParams.get('template') || 'flash'; // flash | luxury | minimal
    const accentColor = searchParams.get('color') || '#22C55E';

    if (!dealId) return new Response('Missing deal_id parameter', { status: 400 });

    const supabase = await createClient();
    
    // Fetch the deal and tell TypeScript not to panic about the joined tables
    const { data, error } = await supabase
      .from('deals')
      .select('title, deal_price, original_price, image_url, category, profiles(business_name, is_verified)')
      .eq('id', dealId)
      .single();

    if (error || !data) return new Response('Deal not found', { status: 404 });

    // Bypass strict TS checking for the Supabase relational join
    const deal = data as any;

    // Dimension handling
    let width = 1080;
    let height = 1920; // 9:16 WhatsApp Story
    if (format === 'square') { height = 1080; } // 1:1 Instagram Post
    if (format === 'banner') { width = 1200; height = 675; } // 16:9 Landscape

    // Handle discounts safely
    const originalPrice = deal.original_price || 0;
    const dealPrice = deal.deal_price || 0;
    
    const discount = originalPrice > dealPrice 
      ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100) 
      : 0;

    // Theme Configs
    const isMinimal = template === 'minimal';
    const isLuxury = template === 'luxury';

    const bgColor = isMinimal ? '#FFFFFF' : isLuxury ? '#0B0F17' : '#111827';
    const textColor = isMinimal ? '#0F172A' : '#FFFFFF';
    const cardBg = isMinimal ? '#F8FAFC' : isLuxury ? '#161E2E' : '#1F2937';
    const borderColor = isMinimal ? '#E2E8F0' : isLuxury ? '#374151' : '#374151';

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: bgColor,
            color: textColor,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: format === 'banner' ? '36px 48px' : '56px 48px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: discount > 0 ? '#EF4444' : accentColor,
                  color: '#FFFFFF',
                  padding: '10px 22px',
                  borderRadius: '100px',
                  fontSize: '22px',
                  fontWeight: 900,
                  display: 'flex',
                }}
              >
                {discount > 0 ? `🔥 ${discount}% OFF PRICE SLASH` : '⚡ VERIFIED LISTING'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
              <span style={{ fontSize: '22px', fontWeight: 700, display: 'flex' }}>
                {deal.profiles?.business_name || 'Verified Vendor'}
              </span>
              {deal.profiles?.is_verified && (
                <span style={{ fontSize: '20px', color: '#38BDF8', display: 'flex' }}>✓</span>
              )}
            </div>
          </div>

          {/* Product Image Stage */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: format === 'banner' ? '46%' : '52%',
              borderRadius: '28px',
              overflow: 'hidden',
              border: `3px solid ${borderColor}`,
              backgroundColor: cardBg,
              position: 'relative',
            }}
          >
            <img
              src={deal.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Title & Price Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            <div
              style={{
                fontSize: format === 'banner' ? '32px' : '44px',
                fontWeight: 900,
                lineHeight: 1.15,
                display: 'flex',
                maxHeight: '110px',
                overflow: 'hidden',
              }}
            >
              {deal.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px' }}>
              <span
                style={{
                  fontSize: format === 'banner' ? '48px' : '62px',
                  fontWeight: 900,
                  color: isLuxury ? '#FBBF24' : accentColor,
                  display: 'flex',
                }}
              >
               {/* {dealPrice.toLocaleString()} */}

                NGN {dealPrice.toLocaleString()}
              </span>
              {originalPrice > dealPrice && (
                <span
                  style={{
                    fontSize: format === 'banner' ? '28px' : '36px',
                    fontWeight: 700,
                    textDecoration: 'line-through',
                    opacity: 0.45,
                    display: 'flex',
                  }}
                >
                  ₦{originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Escrow Trust Stamp */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: cardBg,
              padding: '18px 24px',
              borderRadius: '16px',
              border: `2px solid ${borderColor}`,
              width: '100%',
            }}
          >
            <span style={{ fontSize: '20px', fontWeight: 800, color: textColor, display: 'flex' }}>
              🛡️ Secured by SlashDeals Escrow • 100% Buyer & Seller Protection
            </span>
          </div>
        </div>
      ),
      { width, height }
    );
  } catch (err: any) {
    return new Response(`Flyer Generation Failed: ${err.message}`, { status: 500 });
  }
}