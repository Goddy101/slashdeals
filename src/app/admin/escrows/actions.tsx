// app/admin/escrows/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Admin Service Role for bypassing RLS during the final update
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// INTERNAL HELPERS (Security & Gateway API)
// ============================================================================

async function verifyAdminSession() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) throw new Error('Unauthorized request');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: Only administrators can perform this action.');
  }
  
  return user;
}

async function executeGatewayPayout(escrow: any, vendorBank: any) {
  const payoutReference = `SD_PAYOUT_${escrow.id}_${Date.now()}`;

  if (escrow.gateway === 'paystack') {
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: vendorBank.account_name,
        account_number: vendorBank.account_number,
        bank_code: vendorBank.bank_code,
        currency: 'NGN',
      }),
    });

    const recipientData = await recipientRes.json();
    if (!recipientData.status) throw new Error(`Paystack Recipient Error: ${recipientData.message}`);

    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: escrow.amount * 100, // Paystack uses Kobo
        reference: payoutReference,
        recipient: recipientData.data.recipient_code,
        reason: `SlashDeals Payout for Escrow ${escrow.id}`,
      }),
    });

    const transferData = await transferRes.json();
    if (!transferData.status) throw new Error(`Paystack Transfer Error: ${transferData.message}`);
  } 
  
  else if (escrow.gateway === 'bachs') {
    const bachsRes = await fetch('https://api.bachs.io/v1/payouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BACHS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: escrow.amount,
        currency: 'NGN',
        destination: {
          type: 'bank_account',
          account_number: vendorBank.account_number,
          bank_code: vendorBank.bank_code,
        },
        reference: payoutReference,
        narration: `SlashDeals Escrow Settlement`,
      }),
    });

    const bachsData = await bachsRes.json();
    if (bachsData.error) throw new Error(`Bachs Payout Error: ${bachsData.error.message}`);
  }
}

// ============================================================================
// SERVER ACTIONS (Exposed to UI)
// ============================================================================

export async function releasePayoutAction(formData: FormData) {
  const escrowId = formData.get('escrowId') as string;
  if (!escrowId) throw new Error('Missing Escrow ID');

  await verifyAdminSession(); // Security Lock

  const { data: escrow, error: escrowError } = await supabaseAdmin
    .from('escrows')
    .select(`
      id, amount, gateway, status, listing_id,
      profiles!escrows_seller_id_fkey ( account_name, account_number, bank_code )
    `)
    .eq('id', escrowId)
    .single();

  if (escrowError || !escrow) throw new Error('Escrow not found');
  if (escrow.status !== 'funded') throw new Error('Escrow is not in a funded state');

  const vendorBank = Array.isArray(escrow.profiles) ? escrow.profiles[0] : escrow.profiles;
  if (!vendorBank?.account_number || !vendorBank?.bank_code) {
    throw new Error('Vendor has not provided valid bank details for payout');
  }

  // Execute actual transfer
  await executeGatewayPayout(escrow, vendorBank);

  // Update Database Ledger
  await supabaseAdmin
    .from('escrows')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', escrow.id);

  await supabaseAdmin
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', escrow.listing_id);

  revalidatePath('/admin/escrows');
}

export async function resolveDisputeAction(formData: FormData) {
  const escrowId = formData.get('escrowId') as string;
  const decision = formData.get('decision') as 'refund_buyer' | 'release_to_seller';
  const resolutionNotes = formData.get('resolutionNotes') as string;

  if (!escrowId || !decision || !resolutionNotes) throw new Error('Missing dispute parameters');

  const adminUser = await verifyAdminSession(); // Security Lock

  const { data: escrow, error: escrowError } = await supabaseAdmin
    .from('escrows')
    .select(`
      id, amount, gateway, gateway_reference, status, listing_id,
      profiles!escrows_seller_id_fkey ( account_name, account_number, bank_code )
    `)
    .eq('id', escrowId)
    .single();

  if (escrowError || !escrow) throw new Error('Escrow not found');
  if (escrow.status !== 'disputed') throw new Error('Escrow is not currently under dispute');

  // PATH A: Seller Wins -> Push funds to Seller
  if (decision === 'release_to_seller') {
    const vendorBank = Array.isArray(escrow.profiles) ? escrow.profiles[0] : escrow.profiles;
    if (!vendorBank?.account_number || !vendorBank?.bank_code) {
      throw new Error('Vendor bank details missing. Cannot force payout.');
    }

    await executeGatewayPayout(escrow, vendorBank);

    await supabaseAdmin
      .from('escrows')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', escrow.id);
      
    await supabaseAdmin.from('listings').update({ status: 'sold' }).eq('id', escrow.listing_id);
  } 
  
  // PATH B: Buyer Wins -> Refund Buyer
  else if (decision === 'refund_buyer') {
    if (escrow.gateway === 'paystack') {
      const refundRes = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: escrow.gateway_reference,
          amount: escrow.amount * 100,
          merchant_note: `Dispute Resolution: ${resolutionNotes}`,
        }),
      });
      const refundData = await refundRes.json();
      if (!refundData.status) throw new Error(`Refund Failed: ${refundData.message}`);
    } 
    else if (escrow.gateway === 'bachs') {
      const refundRes = await fetch('https://api.bachs.io/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.BACHS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: escrow.gateway_reference,
          amount: escrow.amount,
          reason: 'fraudulent',
        }),
      });
      const refundData = await refundRes.json();
      if (refundData.error) throw new Error(`Bachs Refund Failed: ${refundData.error.message}`);
    }

    await supabaseAdmin
      .from('escrows')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', escrow.id);
      
    await supabaseAdmin.from('listings').update({ status: 'active' }).eq('id', escrow.listing_id);
  }

  // Log the final verdict to the chat history
  await supabaseAdmin
    .from('dispute_messages')
    .insert({
      escrow_id: escrow.id,
      sender_id: adminUser.id,
      message: `[ADMIN VERDICT]: ${resolutionNotes}`,
      is_admin: true
    });

  revalidatePath('/admin/escrows');
  revalidatePath(`/vault/${escrow.id}`); // Refresh the Handover Room for the users
}