import { z } from "zod";

// يُشارك هذا الملف بين الـ API Route والواجهة الأمامية (نفس مبدأ shared/schemas في الخطة)
export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(72, "كلمة المرور طويلة جدًا") // 72 هو الحد الأقصى الآمن لخوارزميات التجزئة الشائعة
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;