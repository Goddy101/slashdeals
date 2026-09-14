'use server';

import { createClient } from '@/lib/supabase/server';
import { dealSchema, type DealFormData } from '@/lib/validations/deal';
import { revalidatePath } from 'next/cache';

export async function submitDealAction(data: DealFormData) {
  // 1. Validate the incoming data against the Zod schema
  const parsed = dealSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid form data. Please check your inputs.' };
  }

  const supabase = await createClient();

 // const supabase = createClient();

  // 2. See if a user is logged in (to attach their user_id)
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Insert into the deals table
  const { error } = await supabase
    .from('deals')
    .insert({
      title: parsed.data.title,
      deal_url: parsed.data.deal_url,
      original_price: parsed.data.original_price,
      deal_price: parsed.data.deal_price,
      category: parsed.data.category,
      location: parsed.data.location,
      description: parsed.data.description,
      discount_code: parsed.data.discount_code,
      user_id: user?.id || null, // Associates deal with the user if logged in
      is_approved: true, // For MVP we auto-approve standard deals
      is_pinned: false // Only the auction can make this true
    });

  if (error) {
    console.error('Deal submission error:', error);
    return { error: 'Failed to submit deal. Please try again.' };
  }

  // 4. Clear the homepage cache so the new deal appears instantly
  revalidatePath('/');
  
  return { success: true };
}