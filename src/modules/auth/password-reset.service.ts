// src/modules/auth/password-reset.service.ts
import { createHash, randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api-error";
import { sendEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
} from "@/modules/notifications/auth-email-templates";
import {
  consumeTokenAndSetPassword,
  deleteResetToken,
  findResetTokenByHash,
  findUserForReset,
  replaceResetToken,
} from "./password-reset.repository";

export const RESET_TOKEN_TTL_MINUTES = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const baseUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

const invalidToken = () =>
  new ApiError("INVALID_RESET_TOKEN", "رابط الاستعادة غير صالح أو منتهي الصلاحية", 400);

/**
 * يُستدعى في الخلفية (after) والاستجابة للعميل موحّدة دائماً، فلا يمكن
 * استنتاج وجود البريد من الرد ولا من زمن الاستجابة.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findUserForReset(email);
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
  const record = await replaceResetToken(user.id, hashToken(token), expiresAt);

  const resetUrl = `${baseUrl()}/reset-password?token=${token}`;
  const { subject, html, text } = buildPasswordResetEmail({
    name: user.name,
    resetUrl,
    expiresMinutes: RESET_TOKEN_TTL_MINUTES,
  });

  const result = await sendEmail({ to: user.email, subject, html, text });

  if (result.skipped && process.env.NODE_ENV !== "production") {
    // بيئة التطوير بدون RESEND_API_KEY: اطبع الرابط لتجربة الميزة محلياً
    console.info(`[password-reset] DEV link for ${user.email}: ${resetUrl}`);
    return;
  }
  if (!result.ok) {
    await deleteResetToken(record.id);
    console.error("[password-reset] فشل إرسال البريد:", result.error);
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await findResetTokenByHash(hashToken(token));
  // رسالة واحدة لكل الحالات (غير موجود / مستخدم / منتهٍ) لمنع التمييز
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalidToken();

  const passwordHash = await hashPassword(newPassword);
  const user = await consumeTokenAndSetPassword(record.id, record.userId, passwordHash);
  if (!user) throw invalidToken();
  return user;
}

/** إشعار أمني بعد تغيير كلمة المرور — لا يرمي أخطاء أبداً */
export async function sendPasswordChangedNotice(user: { email: string; name: string }) {
  try {
    const { subject, html, text } = buildPasswordChangedEmail({
      name: user.name,
      forgotUrl: `${baseUrl()}/forgot-password`,
    });
    await sendEmail({ to: user.email, subject, html, text });
  } catch (error) {
    console.error("[password-reset] sendPasswordChangedNotice failed:", error);
  }
}