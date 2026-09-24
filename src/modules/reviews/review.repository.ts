import { prisma } from "@/lib/prisma";

type ReviewStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
}

/** شراء موثّق = طلب للمستخدم بحالة DELIVERED يحتوي هذا المنتج */
export async function hasDeliveredPurchase(userId: string, productId: string) {
  const item = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: "DELIVERED" } },
    select: { id: true },
  });
  return item !== null;
}

export function findUserReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true, rating: true, comment: true, status: true },
  });
}

export function createReview(data: {
  productId: string;
  userId: string;
  rating: number;
  comment?: string;
  verifiedPurchase: boolean;
}) {
  return prisma.review.create({
    data: { ...data, status: "PENDING" },
    select: { id: true, rating: true, comment: true, status: true },
  });
}

export async function listApproved(productId: string, skip: number, take: number) {
  const where = { productId, status: "APPROVED" as const };
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return { items, total };
}

export async function ratingDistribution(productId: string) {
  const rows = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId, status: "APPROVED" },
    _count: { _all: true },
  });
  return rows.map((r) => ({ rating: r.rating, count: r._count._all }));
}

export async function adminList(status: ReviewStatusValue | undefined, skip: number, take: number) {
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        product: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return { items, total };
}

export function findById(id: string) {
  return prisma.review.findUnique({ where: { id }, select: { id: true } });
}

export function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
  return prisma.review.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
}

export function deleteById(id: string) {
  return prisma.review.delete({ where: { id }, select: { id: true } });
}