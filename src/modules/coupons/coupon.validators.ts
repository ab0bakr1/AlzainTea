import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "كود الكوبون مطلوب").toUpperCase(),
  subtotal: z.number().positive("المجموع الفرعي يجب أن يكون أكبر من صفر"),
  userId: z.string().cuid().optional(),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;