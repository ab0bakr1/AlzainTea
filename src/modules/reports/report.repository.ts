import { prisma } from "@/lib/prisma";

const EXCLUDED = ["CANCELLED", "RETURNED", "REFUNDED", "FAILED"] as const;

/** الطلبات المحتسبة في المبيعات: مدفوعة وغير ملغاة/مرتجعة */
const paidWhere = (from: Date) => ({
  paymentStatus: "PAID" as const,
  status: { notIn: [...EXCLUDED] },
  createdAt: { gte: from },
});

export async function revenueByCurrency(from: Date) {
  const rows = await prisma.order.groupBy({
    by: ["currency"],
    where: paidWhere(from),
    _sum: { total: true },
    _count: { _all: true },
  });
  return rows.map((r) => ({
    currency: r.currency,
    total: Number(String(r._sum.total ?? 0)),
    orders: r._count._all,
  }));
}

export async function ordersByStatus(from: Date) {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: from } },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status as string, count: r._count._all }));
}

export async function salesByCountry(from: Date) {
  const rows = await prisma.order.groupBy({
    by: ["country", "currency"],
    where: paidWhere(from),
    _sum: { total: true },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({
      country: r.country,
      currency: r.currency,
      total: Number(String(r._sum.total ?? 0)),
      orders: r._count._all,
    }))
    .sort((a, b) => b.orders - a.orders);
}

export async function topProducts(from: Date, take = 5) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: paidWhere(from) },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) } },
    select: { id: true, slug: true, nameAr: true, nameEn: true },
  });
  const map = new Map(products.map((p) => [p.id, p]));

  return rows.flatMap((r) => {
    const p = map.get(r.productId);
    return p
      ? [{ productId: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, unitsSold: r._sum.quantity ?? 0 }]
      : [];
  });
}

export function countNewCustomers(from: Date) {
  return prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: from } } });
}

export function countPendingReviews() {
  return prisma.review.count({ where: { status: "PENDING" } });
}

export async function dailyPaidOrders(from: Date) {
  const rows = await prisma.$queryRaw<{ day: Date; orders: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS orders
    FROM "Order"
    WHERE "paymentStatus" = 'PAID'
      AND "status" NOT IN ('CANCELLED','RETURNED','REFUNDED','FAILED')
      AND "createdAt" >= ${from}
    GROUP BY 1
    ORDER BY 1`;
  return rows;
}

export function lowStock(threshold: number) {
  return prisma.$queryRaw
    <{ id: string; slug: string; nameAr: string; nameEn: string; sku: string; stock: number; reservedStock: number; available: number }[]
    >`
    SELECT id, slug, "nameAr", "nameEn", sku, stock, "reservedStock",
           (stock - "reservedStock")::int AS available
    FROM "Product"
    WHERE status = 'ACTIVE' AND (stock - "reservedStock") <= ${threshold}
    ORDER BY (stock - "reservedStock") ASC
    LIMIT 20`;
}