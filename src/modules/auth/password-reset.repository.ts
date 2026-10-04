// src/modules/auth/password-reset.repository.ts
import { prisma } from "@/lib/prisma";

export function findUserForReset(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
}

/** يحذف رموز المستخدم السابقة (+ أي رموز منتهية في النظام) ثم ينشئ رمزاً جديداً ذرياً */
export async function replaceResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  const [, created] = await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
      select: { id: true },
    }),
  ]);
  return created;
}

export function deleteResetToken(id: string) {
  return prisma.passwordResetToken.deleteMany({ where: { id } });
}

export function findResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

/**
 * حجز الرمز + تغيير كلمة المرور داخل معاملة واحدة:
 * الحجز شرطي (usedAt = null وغير منتهٍ) فينجح مرة واحدة فقط حتى مع طلبات متزامنة،
 * وإن فشل تحديث كلمة المرور يُلغى الحجز تلقائياً.
 */
export function consumeTokenAndSetPassword(tokenId: string, userId: string, passwordHash: string) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) return null;

    const user = await tx.user.update({
      where: { id: userId },
      data: { password: passwordHash },
      select: { email: true, name: true },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId, id: { not: tokenId } } });
    return user;
  });
}