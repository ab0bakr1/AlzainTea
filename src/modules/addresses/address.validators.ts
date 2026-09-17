import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح"),
  country: z.string().length(2, "رمز الدولة يجب أن يكون حرفين (مثال: SA)"),
  city: z.string().trim().min(1, "المدينة مطلوبة"),
  street: z.string().trim().min(1, "العنوان مطلوب"),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = addressSchema.partial();

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;