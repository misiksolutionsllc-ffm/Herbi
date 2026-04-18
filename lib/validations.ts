import { z } from "zod";

export const cartItemSchema = z.object({
  slug: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutInputSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
