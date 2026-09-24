// src/modules/products/product.service.ts
import { ApiError } from "@/lib/api-error";
import type {
  ProductQuery,
  AdminProductsQuery,
  CreateProductInput,
  UpdateProductInput,
} from "./product.validators";
import {
  findManyProducts,
  getAvailableFacets,
  findProductBySlug,
  findProductById,
  findManyAdminProducts,
  createProductRecord,
  updateProductRecord,
  deleteOrArchiveProduct,
} from "./product.repository";
import { unknown } from "zod";

export async function listProducts(query: ProductQuery) {
  const { items, total } = await findManyProducts(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  const serialized = items.map((p: any) => ({
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

// ===== إضافات الإدارة وتفاصيل المنتج =====
function serializeProduct<
  T extends { price: unknown; compareAtPrice?: unknown; variants?: Array<{ price: unknown }> },
>(p: T) {
  return {
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
    variants: p.variants?.map((v) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
    })),
  };
}

async function getBySlug(slug: string) {
  const product = await findProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") {
    throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);
  }
  return { ...serializeProduct(product), availableStock: product.stock - product.reservedStock };
}

async function getById(id: string) {
  const product = await findProductById(id);
  if (!product) throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);
  return serializeProduct(product);
}

async function adminList(query: AdminProductsQuery) {
  const { items, total } = await findManyAdminProducts(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    data: items.map(serializeProduct),
    meta: { page: query.page, limit: query.limit, total, totalPages },
  };
}

async function create(input: CreateProductInput) {
  return serializeProduct(await createProductRecord(input)); // تكرار slug/sku يعطي P2002 ثم 409 تلقائياً
}

async function update(id: string, input: UpdateProductInput) {
  await getById(id); // يرمي 404 إن لم يوجد
  return serializeProduct(await updateProductRecord(id, input));
}

async function remove(id: string) {
  await getById(id);
  return deleteOrArchiveProduct(id);
}

export const productService = {
  list: listProducts,
  filters: getProductFilters,
  adminList,
  getBySlug,
  getById,
  create,
  update,
  remove,
};