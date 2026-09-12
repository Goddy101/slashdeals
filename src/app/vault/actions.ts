// app/vault/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { sendAdminTelegramAlert } from '@/lib/notifications'; // Using our unified engine

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function raiseDisputeAction(formData: FormData) {
  const escrowId = formData.get('escrowId') as string;
  const complaint = formData.get('complaint') as string;
  
  if (!escrowId || !complaint) throw new Error('Missing required fields');

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // 1. Verify the user is actually the buyer of this escrow
  const { data: escrow } = await supabaseAdmin
    .from('escrows')
    .select('buyer_id, status, amount, listings(title)')
    .eq('id', escrowId)
    .single();

  if (escrow?.buyer_id !== user.id) throw new Error('Only the buyer can dispute this transaction.');
  if (escrow?.status !== 'funded') throw new Error('Cannot dispute this escrow state.');

  // 2. FREEZE THE FUNDS: Update status to disputed
  await supabaseAdmin
    .from('escrows')
    .update({ 
      status: 'disputed',
      updated_at: new Date().toISOString() 
    })
    .eq('id', escrowId);

  // 3. Log the initial complaint as the first message
  await supabaseAdmin
    .from('dispute_messages')
    .insert({
      escrow_id: escrowId,
      sender_id: user.id,
      message: complaint
    });

  // 4. Alert the Admin via Telegram
  await sendAdminTelegramAlert({
    orderId: escrowId,
    itemTitle: `🚨 DISPUTE: ${escrow.listings?.[0]?.title}`,
    amount: escrow.amount,
    sellerEmail: 'admin@slashdeals.com.ng', // Using your internal address
    sellerPhone: 'Check Admin Dashboard immediately.'
  });

  revalidatePath(`/vault/${escrowId}`);
}