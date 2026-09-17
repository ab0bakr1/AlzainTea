// src/modules/products/product.service.ts
import type { ProductQuery } from "./product.validators";
import { findManyProducts, getAvailableFacets } from "./product.repository";

export async function listProducts(query: ProductQuery) {
  const { items, total } = await findManyProducts(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  // تحويل Decimal (Prisma) إلى number عادي قبل إرساله كـ JSON للواجهة
  const serialized = items.map((p) => ({
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    availableStock: p.stock - p.reservedStock,
  }));

  return {
    data: serialized,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
}

export async function getProductFilters(query: ProductQuery) {
  return getAvailableFacets(query);
}