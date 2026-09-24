import { prisma } from "@/lib/prisma";

/**
 * فحص اتصال قاعدة البيانات (الطبقة الوحيدة المسموح لها باستدعاء Prisma).
 * يرمي استثناءً إذا فشل الاتصال.
 */
export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}