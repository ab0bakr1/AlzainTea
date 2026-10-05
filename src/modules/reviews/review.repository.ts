import { prisma } from "@/lib/prisma";

type ReviewStatusValue = "PENDING" | "APPROVED" | "REJECTED";
type SortDir = "asc" | "desc";

export type AdminReviewSort = "newest" | "oldest" | "rating_desc" | "rating_asc";

export interface AdminReviewFilters {
  status?: ReviewStatusValue;
  rating?: number;
  verified?: boolean;
  q?: string;
}

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

// ===== الإدارة =====
function buildAdminWhere(f: AdminReviewFilters) {
  const q = f.q?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.rating ? { rating: f.rating } : {}),
    ...(f.verified !== undefined ? { verifiedPurchase: f.verified } : {}),
    ...(q
      ? {
          OR: [
            { comment: contains(q) },
            { product: { nameAr: contains(q) } },
            { product: { nameEn: contains(q) } },
            { user: { name: contains(q) } },
            { user: { email: contains(q) } },
          ],
        }
      : {}),
  };
}

/** فرز مستقر: id كمفتاح أخير حتى لا تتكرر/تضيع صفوف بين الصفحات */
function buildAdminOrderBy(sort: AdminReviewSort): { createdAt?: SortDir; rating?: SortDir; id?: SortDir }[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "rating_desc":
      return [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "rating_asc":
      return [{ rating: "asc" }, { createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export async function adminList(
  filters: AdminReviewFilters,
  sort: AdminReviewSort,
  skip: number,
  take: number,
) {
  const where = buildAdminWhere(filters);
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: buildAdminOrderBy(sort),
      skip,
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        product: { select: { id: true, slug: true, nameAr: true, nameEn: true, images: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return { items, total };
}

/** عدّادات الحالات + متوسط التقييم المعتمد (مستقلة عن الفلاتر) */
export async function adminStats() {
  const [rows, avg] = await Promise.all([
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true } }),
  ]);
  return {
    byStatus: rows.map((r) => ({ status: r.status as ReviewStatusValue, count: r._count._all })),
    averageRating: avg._avg.rating,
  };
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

export async function updateManyStatus(ids: string[], status: "APPROVED" | "REJECTED") {
  const res = await prisma.review.updateMany({ where: { id: { in: ids } }, data: { status } });
  return res.count;
}

export async function deleteManyByIds(ids: string[]) {
  const res = await prisma.review.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}