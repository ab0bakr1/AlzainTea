import { prisma } from "@/lib/prisma";

export function findProduct(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
}

export async function listByUser(userId: string, skip: number, take: number) {
  const where = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.wishlistItem.findMany({
      where,
      orderBy: { addedAt: "desc" },
      skip,
      take,
      select: {
        addedAt: true,
        product: {
          select: {
            id: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            price: true,
            compareAtPrice: true,
            images: true,
            status: true,
            stock: true,
            reservedStock: true,
          },
        },
      },
    }),
    prisma.wishlistItem.count({ where }),
  ]);
  return { items, total };
}

export async function listProductIds(userId: string): Promise<string[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

export function add(userId: string, productId: string) {
  return prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
    select: { productId: true },
  });
}

export async function remove(userId: string, productId: string) {
  const res = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  return res.count;
}