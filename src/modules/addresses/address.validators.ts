// src/modules/addresses/address.validators.ts

import { z } from "zod";
import { SUPPORTED_COUNTRIES } from "@/lib/shipping-rates";

const supportedCountries = SUPPORTED_COUNTRIES as readonly string[];

// الحقول المشتركة بين الإنشاء والتعديل (بدون isDefault عمداً، انظر الملاحظة أدناه)
const addressFields = {
  fullName: z.string().trim().min(2, "الاسم الكامل مطلوب").max(100, "الاسم طويل جداً"),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح").max(30, "رقم الهاتف طويل جداً"),
  country: z
    .string()
    .trim()
    .length(2, "رمز الدولة يجب أن يكون حرفين (مثال: SA)")
    .toUpperCase()
    .refine((code) => supportedCountries.includes(code), "لا نشحن إلى هذه الدولة حالياً"),
  city: z.string().trim().min(1, "المدينة مطلوبة").max(100, "اسم المدينة طويل جداً"),
  street: z.string().trim().min(1, "العنوان مطلوب").max(255, "العنوان طويل جداً"),
  // تُرسل "" لمسح الرمز البريدي؛ يحوّلها address.service إلى null
  postalCode: z.string().trim().max(20, "الرمز البريدي طويل جداً").nullish(),
};

export const addressSchema = z.object({
  ...addressFields,
  isDefault: z.boolean().optional().default(false),
});

// ملاحظة مهمة (Zod 4): الحقول ذات .default() داخل .partial() تُطبَّق قيمتها الافتراضية
// حتى لو غابت من الطلب. كان هذا يُسقط isDefault إلى false عند أي تعديل (حتى تعديل المدينة فقط)
// فيفقد العنوان الافتراضي صفته بصمت. لذلك isDefault هنا اختياري بلا قيمة افتراضية.
export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .extend({ isDefault: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, { message: "لا توجد بيانات للتعديل" });

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;