// app/api/campaigns/wallet-checkout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId, price, headline, imageUrl, dealLink } = await request.json();

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Trigger the atomic deduction
    const { data, error } = await supabaseAdmin.rpc('purchase_ad_with_wallet', {
      p_merchant_id: user.id,
      p_amount: price,
      p_category_id: categoryId,
      p_headline: headline,
      p_image_url: imageUrl,
      p_deal_link: dealLink
    });

    if (error) {
      if (error.message.includes('Insufficient')) {
        return NextResponse.json({ error: 'Insufficient wallet funds. Please top up or earn more.' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, campaign_id: data.campaign_id });

  } catch (error: any) {
    console.error('Ad Purchase Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}