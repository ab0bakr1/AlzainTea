// src/lib/validations/auth.ts
// مخططات zod الخاصة بالمصادقة

import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "رقم الجوال غير صالح")
    .optional(),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل"),
});

export type RegisterInput = z.infer<typeof registerSchema>;