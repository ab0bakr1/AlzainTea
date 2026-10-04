import { z } from "zod";

// مصدر الحقيقة الوحيد لقواعد التسجيل: يستخدمه الخادم (رسائل عربية افتراضية)
// والواجهة (رسائل مترجمة عبر next-intl).
export const defaultRegisterMessages = {
  nameMin: "الاسم قصير جدًا",
  nameMax: "الاسم طويل جدًا",
  emailInvalid: "بريد إلكتروني غير صالح",
  passwordMin: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
  passwordMax: "كلمة المرور طويلة جدًا",
  passwordLower: "يجب أن تحتوي على حرف صغير",
  passwordUpper: "يجب أن تحتوي على حرف كبير",
  passwordDigit: "يجب أن تحتوي على رقم",
  confirmRequired: "أكّد كلمة المرور",
  passwordMismatch: "كلمتا المرور غير متطابقتين",
};
export type RegisterMessages = typeof defaultRegisterMessages;

export function makeRegisterSchema(m: RegisterMessages = defaultRegisterMessages) {
  return z.object({
    name: z.string().trim().min(2, m.nameMin).max(80, m.nameMax),
    email: z.string().trim().toLowerCase().email(m.emailInvalid),
    password: z
      .string()
      .min(8, m.passwordMin)
      .max(72, m.passwordMax)
      .regex(/[a-z]/, m.passwordLower)
      .regex(/[A-Z]/, m.passwordUpper)
      .regex(/[0-9]/, m.passwordDigit),
  });
}

export const registerSchema = makeRegisterSchema();
export type RegisterInput = z.infer<typeof registerSchema>;

/** مخطط نموذج الواجهة = نفس القواعد + تأكيد كلمة المرور (لا يُرسل للخادم) */
export function makeRegisterFormSchema(m: RegisterMessages = defaultRegisterMessages) {
  return makeRegisterSchema(m)
    .extend({ confirmPassword: z.string().min(1, m.confirmRequired) })
    .refine((d) => d.password === d.confirmPassword, {
      path: ["confirmPassword"],
      message: m.passwordMismatch,
    });
}
export type RegisterFormInput = z.input<ReturnType<typeof makeRegisterFormSchema>>;
export type RegisterFormOutput = z.output<ReturnType<typeof makeRegisterFormSchema>>;

/** فحوصات كلمة المرور لمؤشر القوة في الواجهة */
export function getPasswordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
  };
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── استعادة كلمة المرور ──
export function makeForgotPasswordSchema(m: RegisterMessages = defaultRegisterMessages) {
  return z.object({ email: z.string().trim().toLowerCase().email(m.emailInvalid) });
}
export const forgotPasswordSchema = makeForgotPasswordSchema();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function makeResetPasswordSchema(m: RegisterMessages = defaultRegisterMessages) {
  return z.object({
    token: z.string().min(1).max(256),
    // نفس قواعد كلمة المرور في التسجيل (مصدر حقيقة واحد)
    password: makeRegisterSchema(m).shape.password,
  });
}
export const resetPasswordSchema = makeResetPasswordSchema();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** مخطط نموذج الواجهة: كلمة المرور + التأكيد (الرمز يأتي من الرابط ولا يُدخله المستخدم) */
export function makeResetPasswordFormSchema(m: RegisterMessages = defaultRegisterMessages) {
  return z
    .object({
      password: makeRegisterSchema(m).shape.password,
      confirmPassword: z.string().min(1, m.confirmRequired),
    })
    .refine((d) => d.password === d.confirmPassword, {
      path: ["confirmPassword"],
      message: m.passwordMismatch,
    });
}
export type ResetPasswordFormInput = z.input<ReturnType<typeof makeResetPasswordFormSchema>>;
export type ResetPasswordFormOutput = z.output<ReturnType<typeof makeResetPasswordFormSchema>>;