'use server';

import { createClient } from '@/lib/supabase/server';

export async function upvoteDealAction(dealId: string) {
  const supabase = createClient();

  const { data: deal, error: fetchError } = await supabase
    .from('deals')
    .select('upvotes_count')
    .eq('id', dealId)
    .single();

  if (fetchError || !deal) return { success: false };

  const { error: updateError } = await supabase
    .from('deals')
    .update({ upvotes_count: (deal.upvotes_count || 0) + 1 })
    .eq('id', dealId);

  if (updateError) return { success: false };

  return { success: true };
}