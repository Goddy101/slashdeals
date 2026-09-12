// app/admin/withdrawals/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function approveWithdrawalAction(formData: FormData) {
  const transactionId = formData.get('transactionId') as string;
  if (!transactionId) throw new Error('Missing Transaction ID');

  await verifyAdminSession(); // Security Lock

  // 1. Fetch the pending withdrawal
  const { data: tx, error: txError } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*, profiles(account_name)')
    .eq('id', transactionId)
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .single();

  if (txError || !tx) throw new Error('Pending withdrawal not found');

  const metadata = tx.metadata as any;
  const vendorBank = {
    account_name: tx.profiles?.account_name || 'Merchant Payout',
    account_number: metadata.account_number,
    bank_code: metadata.bank_code // 🚀 FIXED: Now properly uses the 3-digit code
  };

  const payoutReference = `SD_WD_${tx.id}_${Date.now()}`;

  // 2. Execute Paystack Transfer
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
      amount: tx.amount * 100, // Paystack uses Kobo
      reference: payoutReference,
      recipient: recipientData.data.recipient_code,
      reason: `SlashDeals Withdrawal: ${tx.id}`,
    }),
  });

  const transferData = await transferRes.json();
  if (!transferData.status) throw new Error(`Paystack Transfer Error: ${transferData.message}`);

//   // 3. Mark the transaction as complete
//   await supabaseAdmin
//     .from('wallet_transactions')
//     .update({ 
//       status: 'completed', // Using 'completed' to match your UI's logic
//       updated_at: new Date().toISOString() 
//     })
//     .eq('id', tx.id);

// 3. Mark the transaction as processing, waiting for webhook confirmation
  await supabaseAdmin
    .from('wallet_transactions')
    .update({ 
      status: 'processing', // 🚀 Changed from 'completed'
      updated_at: new Date().toISOString() 
    })
    .eq('id', tx.id);

  revalidatePath('/admin/withdrawals'); // Ensure the path matches your actual admin page route
  
  return { success: true };
}









// // app/admin/withdrawals/actions.ts
// 'use server';

// import { cookies } from 'next/headers';
// import { createServerClient } from '@supabase/ssr';
// import { createClient } from '@supabase/supabase-js';
// import { revalidatePath } from 'next/cache';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// async function verifyAdminSession() {
//   const cookieStore = await cookies();
//   const supabaseAuth = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { cookies: { getAll() { return cookieStore.getAll(); } } }
//   );

//   const { data: { user } } = await supabaseAuth.auth.getUser();
//   if (!user) throw new Error('Unauthorized request');

//   const { data: profile } = await supabaseAdmin
//     .from('profiles')
//     .select('role')
//     .eq('id', user.id)
//     .single();

//   if (profile?.role !== 'admin') {
//     throw new Error('Forbidden: Only administrators can perform this action.');
//   }
  
//   return user;
// }

// export async function approveWithdrawalAction(formData: FormData) {
//   const transactionId = formData.get('transactionId') as string;
//   if (!transactionId) throw new Error('Missing Transaction ID');

//   await verifyAdminSession(); // Security Lock

//   // 1. Fetch the pending withdrawal
//   const { data: tx, error: txError } = await supabaseAdmin
//     .from('wallet_transactions')
//     .select('*, profiles(account_name)')
//     .eq('id', transactionId)
//     .eq('type', 'withdrawal')
//     .eq('status', 'pending')
//     .single();

//   if (txError || !tx) throw new Error('Pending withdrawal not found');

//   const metadata = tx.metadata as any;
//   const vendorBank = {
//     account_name: tx.profiles?.account_name || 'Merchant Payout',
//     account_number: metadata.account_number,
//     bank_code: metadata.bank_name // Ensure this is passing the 3-digit code
//   };

//   const payoutReference = `SD_WD_${tx.id}_${Date.now()}`;

//   // 2. Execute Paystack Transfer (Using your exact logic)
//   const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       type: 'nuban',
//       name: vendorBank.account_name,
//       account_number: vendorBank.account_number,
//       bank_code: vendorBank.bank_code,
//       currency: 'NGN',
//     }),
//   });

//   const recipientData = await recipientRes.json();
//   if (!recipientData.status) throw new Error(`Paystack Recipient Error: ${recipientData.message}`);

//   const transferRes = await fetch('https://api.paystack.co/transfer', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       source: 'balance',
//       amount: tx.amount * 100, // Paystack uses Kobo
//       reference: payoutReference,
//       recipient: recipientData.data.recipient_code,
//       reason: `SlashDeals Withdrawal: ${tx.reference}`,
//     }),
//   });

//   const transferData = await transferRes.json();
//   if (!transferData.status) throw new Error(`Paystack Transfer Error: ${transferData.message}`);

//   // 3. Mark the transaction as complete
//   await supabaseAdmin
//     .from('wallet_transactions')
//     .update({ 
//       status: 'success', // Or 'processing' if you rely on Paystack webhooks to confirm
//       updated_at: new Date().toISOString() 
//     })
//     .eq('id', tx.id);

//   revalidatePath('/admin/withdrawals');
  
//   return { success: true };
// }