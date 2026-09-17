import { prisma } from "@/lib/prisma";

export function findActiveCouponByCode(code: string) {
  return prisma.coupon.findFirst({
    where: { code, isActive: true },
  });
}

export function countUserCouponUsages(couponId: string, userId: string) {
  return prisma.couponUsage.count({ where: { couponId, userId } });
}

// ملاحظة: يُستدعى فعلياً عند إنشاء الطلب (checkout.repository)، وليس عند مجرد "التحقق"
// من الكوبون، حتى لا يُحتسب استخدام كوبون على طلب لم يكتمل.
export function recordCouponUsage(couponId: string, userId: string) {
  return prisma.$transaction([
    prisma.couponUsage.create({ data: { couponId, userId } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
  ]);
}