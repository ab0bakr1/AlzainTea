import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { RegisterInput } from "./auth.validators";

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super("EMAIL_ALREADY_USED");
  }
}

/**
 * تسجيل مستخدم جديد. يتحقق من عدم تكرار البريد ثم يشفّر كلمة المرور قبل الحفظ.
 * لا تُخزَّن أي كلمة مرور نصية أبدًا.
 */
// استبدل دالة registerUser في src/modules/auth/auth.service.ts بهذه النسخة
// (الجديد: تحويل تعارض P2002 عند التسجيل المتزامن بنفس البريد إلى EmailAlreadyUsedError)
export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new EmailAlreadyUsedError();

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.create({
      data: { name: input.name, email: input.email, password: passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new EmailAlreadyUsedError();
    throw err;
  }
}

/**
 * يستخدمه NextAuth Credentials Provider للتحقق من بيانات الدخول.
 * يرجع null لأي حالة فشل (مستخدم غير موجود / بدون كلمة مرور / كلمة مرور خاطئة)
 * دون تمييز الرسالة بينها، لمنع تسريب معلومات عن وجود البريد من عدمه.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.password) return null;

  const valid = await verifyPassword(user.password, password);
  if (!valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}