// app/dashboard/settings/bank/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';

// 1. Fetch the list of Nigerian Banks from Paystack
export async function getNigerianBanks() {
  const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
    // Cache the bank list for 24 hours to speed up page load
    next: { revalidate: 86400 } 
  });
  
  const data = await response.json();
  if (!data.status) throw new Error('Failed to fetch banks');
  return data.data; // Returns an array of { name, code }
}

// 2. Verify the Account Number (Bank Resolve API)
export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  const response = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, 
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
  
  const data = await response.json();
  if (!data.status) {
    return { success: false, error: data.message };
  }
  return { success: true, accountName: data.data.account_name };
}

// 3. Save the Verified Details to Supabase
export async function saveBankDetails(formData: FormData) {
  const account_number = formData.get('accountNumber') as string;
  const bank_code = formData.get('bankCode') as string;
  const bank_name = formData.get('bankName') as string;
  const account_name = formData.get('accountName') as string;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('profiles')
    .update({ account_number, bank_code, bank_name, account_name })
    .eq('id', user.id);

  if (error) throw new Error('Failed to save bank details');

  revalidatePath('/dashboard/settings/bank');
  return { success: true };
}