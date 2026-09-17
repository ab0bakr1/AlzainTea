// src/modules/cart/cart.validators.ts
import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().positive().max(99, "الكمية القصوى المسموحة لكل عنصر هي 99"),
});

export const validateCartSchema = z.object({
  items: z.array(cartLineSchema).min(1, "السلة فارغة"),
});

export type ValidateCartInput = z.infer<typeof validateCartSchema>;