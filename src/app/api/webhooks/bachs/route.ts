// app/api/webhooks/bachs/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { triggerEscrowFundedNotifications } from '@/lib/notifications'; // <-- 1. Import your engine

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-bachs-signature');

    // 1. Verify Bachs Signature
    if (process.env.BACHS_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.BACHS_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Best practice: Use timingSafeEqual in production to prevent timing attacks
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // 2. Process Successful Payment / Collection Event
    if (event.type === 'checkout.completed' || event.type === 'collection.succeeded') {
      const reference = event.data?.reference || event.reference;
      const fundedAt = new Date();
      const inspectionExpiresAt = new Date(fundedAt.getTime() + 48 * 60 * 60 * 1000);

      // 3. Lock Funds & Fetch details for Notifications
      const { data: escrow, error } = await supabase
        .from('escrows')
        .update({
          status: 'funded',
          funded_at: fundedAt.toISOString(),
          inspection_expires_at: inspectionExpiresAt.toISOString(),
        })
        .eq('payment_reference', reference)
.eq('status', 'pending_payment')
        .select(`
          id,
          amount,
          listing_id,
          seller_id,
          listings ( title )
        `)
        .single();

      if (error || !escrow) throw new Error('Escrow record not found');

      // 4. Update Listing status to prevent double-selling
      await supabase
        .from('listings')
        .update({ status: 'escrow_locked' })
        .eq('id', escrow.listing_id);

      // 5. Fetch the Seller's contact info
      const { data: sellerData } = await supabase
        .from('profiles') // Ensure this matches your user profiles table
        .select('email, phone')
        .eq('id', escrow.seller_id)
        .single();

      // 6. Fire the Telegram & Email Notifications! 🚀
      await triggerEscrowFundedNotifications({
        orderId: escrow.id,
        itemTitle: escrow.listings?.[0]?.title || 'SlashDeals Asset',
        amount: escrow.amount,
        sellerEmail: sellerData?.email || event.data?.customer?.email || 'vendor@slashdeals.com.ng',
        sellerPhone: sellerData?.phone || '+2340000000000'
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Bachs Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}