import { z } from "zod";
import { SUPPORTED_COUNTRIES } from "@/lib/shipping-rates";

export const checkoutItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().positive(),
});

const guestAddressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  city: z.string().trim().min(1),
  street: z.string().trim().min(1),
  postalCode: z.string().trim().optional(),
});

export const createCheckoutSessionSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1, "السلة فارغة"),
    country: z.enum(SUPPORTED_COUNTRIES as [string, ...string[]], {
      errorMap: () => ({ message: "الدولة المحددة غير مدعومة" }),
    }),
    addressId: z.string().cuid().optional(),
    guestAddress: guestAddressSchema.optional(),
    guestEmail: z.string().email().optional(),
    couponCode: z.string().trim().optional(),
    vatNumber: z.string().trim().optional(),
  })
  .refine((data) => data.addressId || data.guestAddress, {
    message: "يجب اختيار عنوان محفوظ أو إدخال عنوان زائر",
    path: ["addressId"],
  });

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;