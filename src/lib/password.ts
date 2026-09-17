import * as argon2 from "argon2";

/**
 * تشفير كلمة المرور باستخدام argon2id (الأقوى أمنيًا من bcrypt).
 * إن كانت بيئة الاستضافة لا تدعم native bindings، استبدل هذا الملف بـ bcrypt
 * دون الحاجة لتغيير أي كود آخر — الواجهة (hashPassword/verifyPassword) تبقى كما هي.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB — توصية OWASP الحالية
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // أي فشل في التحقق (تنسيق تالف مثلاً) يُعامل كفشل مصادقة، وليس خطأ خادم
    return false;
  }
}