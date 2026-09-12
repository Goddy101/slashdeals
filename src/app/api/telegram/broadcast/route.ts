// src/app/api/telegram/broadcast/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastDealToTelegram } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Verify User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, price, imageUrl, dealId, isFlashBump } = await request.json();

    // 2. Security Check: Ensure the deal actually belongs to this user and is active
    const { data: deal } = await supabase
      .from('deals')
      .select('id, status')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found or unauthorized' }, { status: 403 });
    }

    if (deal.status !== 'active') {
      return NextResponse.json({ error: 'Cannot broadcast inactive deals' }, { status: 400 });
    }

    // 3. Fire the Broadcast!
    const dealUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/deal/${deal.id}`;
    
    await broadcastDealToTelegram({
      title,
      price,
      imageUrl,
      dealUrl,
      isFlashBump
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Telegram API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}