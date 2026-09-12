import { z } from 'zod';

export const dealSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120, "Title is too long"),
  deal_url: z.string().url("Must be a valid URL (e.g., https://...)"),
  original_price: z.coerce.number().min(0).optional().default(0),
  deal_price: z.coerce.number().min(0, "Deal price cannot be negative"),
  category: z.enum(['tech', 'fashion', 'food', 'groceries', 'travel', 'finance', 'education', 'services', 'general']),
  location: z.string().min(2, "Location is required").max(100),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
  discount_code: z.string().optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;