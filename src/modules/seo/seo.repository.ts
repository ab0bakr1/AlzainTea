import { prisma } from "@/lib/prisma";

export async function findProductForSeo(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
    select: {
      id: true,
      slug: true,
      sku: true,
      nameAr: true,
      nameEn: true,
      descAr: true,
      descEn: true,
      price: true,
      images: true,
      stock: true,
      reservedStock: true,
      updatedAt: true,
      category: { select: { slug: true, nameAr: true, nameEn: true } },
      brand: { select: { nameAr: true, nameEn: true } },
    },
  });
}

export async function getApprovedRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { average: agg._avg.rating ?? 0, count: agg._count._all };
}

export async function findCategoryForSeo(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      slug: true,
      nameAr: true,
      nameEn: true,
      description: true,
      image: true,
      parent: { select: { slug: true, nameAr: true, nameEn: true } },
    },
  });
}

export async function listSitemapProducts() {
  return prisma.product.findMany({
    where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45000, // حد Sitemap الواحد 50,000 رابط
  });
}

export async function listSitemapCategories() {
  return prisma.category.findMany({
    select: { slug: true, updatedAt: true },
  });
}