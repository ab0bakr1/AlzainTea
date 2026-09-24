import { ApiError } from "@/lib/api-error";
import * as repo from "./wishlist.repository";
import type { WishlistListQuery } from "./wishlist.validators";

export async function getWishlist(userId: string, query: WishlistListQuery) {
  if (query.idsOnly) {
    return { data: { productIds: await repo.listProductIds(userId) }, meta: undefined };
  }

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await repo.listByUser(userId, skip, query.limit);

  return {
    data: {
      items: items.map(({ product: p, addedAt }) => ({
        addedAt,
        product: {
          id: p.id,
          slug: p.slug,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          price: Number(String(p.price)), // USD
          compareAtPrice: p.compareAtPrice ? Number(String(p.compareAtPrice)) : null,
          image: p.images[0] ?? null,
          status: p.status,
          available: Math.max(0, p.stock - p.reservedStock),
        },
      })),
    },
    meta: { page: query.page, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function addToWishlist(userId: string, productId: string) {
  const product = await repo.findProduct(productId);
  if (!product || product.status !== "ACTIVE") {
    throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);
  }
  await repo.add(userId, productId); // upsert → آمن ضد التكرار
  return { productId, inWishlist: true };
}

export async function removeFromWishlist(userId: string, productId: string) {
  await repo.remove(userId, productId); // idempotent
  return { productId, inWishlist: false };
}