// src/modules/products/product.service.ts
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import {
  LOW_STOCK_THRESHOLD,
  type ProductQuery,
  type AdminProductsQuery,
  type CreateProductInput,
  type UpdateProductInput,
} from "./product.validators";
import {
  findManyProducts,
  getAvailableFacets,
  findProductBySlug,
  findProductById,
  findManyAdminProducts,
  findProductConflicts,
  categoryExists,
  brandExists,
  createProductRecord,
  updateProductRecord,
  deleteOrArchiveProduct,
} from "./product.repository";

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

// ===== التسلسل (Decimal → number) =====
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

// ===== قواعد العمل =====

/** التزام بقيمة فريدة (slug/sku) تسابقت عليها عمليتان: رسالة واضحة بدل 500 */
function rethrowUniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(
      "CONFLICT",
      "الـ slug أو رمز SKU (للمنتج أو لأحد المتغيرات) مستخدم مسبقاً",
      409,
    );
  }
  throw error;
}

function assertDiscountPrice(price: number, compareAtPrice: number | null | undefined) {
  if (compareAtPrice != null && compareAtPrice <= price) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي",
      400,
    );
  }
}

function assertActivatable(status: string, images: string[]) {
  if (status === "ACTIVE" && images.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "أضف صورة واحدة على الأقل قبل تفعيل المنتج", 400);
  }
}

async function assertReferences(categoryId?: string, brandId?: string | null) {
  if (categoryId && !(await categoryExists(categoryId))) {
    throw new ApiError("CATEGORY_NOT_FOUND", "الفئة المحددة غير موجودة", 422);
  }
  if (brandId && !(await brandExists(brandId))) {
    throw new ApiError("BRAND_NOT_FOUND", "الماركة المحددة غير موجودة", 422);
  }
}

async function assertNoConflicts(input: { slug?: string; sku?: string }, excludeId?: string) {
  const conflicts = await findProductConflicts(input, excludeId);
  if (conflicts.slug && conflicts.sku) {
    throw new ApiError("CONFLICT", "الـ slug ورمز SKU مستخدمان مسبقاً في منتج آخر", 409);
  }
  if (conflicts.slug) throw new ApiError("CONFLICT", "الـ slug مستخدم مسبقاً في منتج آخر", 409);
  if (conflicts.sku) throw new ApiError("CONFLICT", "رمز SKU مستخدم مسبقاً في منتج آخر", 409);
}

// ===== العمليات =====

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
  return {
    ...serializeProduct(product),
    availableStock: Math.max(0, product.stock - product.reservedStock),
  };
}

async function adminList(query: AdminProductsQuery) {
  const { items, total, counts } = await findManyAdminProducts(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    data: items.map((p) => ({
      ...serializeProduct(p),
      availableStock: Math.max(0, p.stock - p.reservedStock),
      variantsCount: p._count.variants,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      counts,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
  };
}

async function create(input: CreateProductInput) {
  assertDiscountPrice(input.price, input.compareAtPrice);
  assertActivatable(input.status, input.images);
  await assertReferences(input.categoryId, input.brandId);
  await assertNoConflicts({ slug: input.slug, sku: input.sku });

  try {
    return serializeProduct(await createProductRecord(input));
  } catch (error) {
    return rethrowUniqueConflict(error);
  }
}

async function update(id: string, input: UpdateProductInput) {
  const current = await findProductById(id);
  if (!current) throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);

  // لا يجوز أن ينزل المخزون الفعلي عن الكمية المحجوزة لطلبات قيد الدفع
  if (input.stock !== undefined && input.stock < current.reservedStock) {
    throw new ApiError(
      "STOCK_BELOW_RESERVED",
      `لا يمكن أن يقل المخزون عن الكمية المحجوزة حالياً لطلبات قيد الدفع (${current.reservedStock})`,
      422,
    );
  }

  // نتحقق من القواعد فقط عند لمس الحقول المعنية، حتى لا تعطّل بيانات قديمة تعديلات غير مرتبطة
  if (input.price !== undefined || input.compareAtPrice !== undefined) {
    assertDiscountPrice(
      input.price ?? Number(current.price),
      input.compareAtPrice !== undefined
        ? input.compareAtPrice
        : current.compareAtPrice != null
          ? Number(current.compareAtPrice)
          : null,
    );
  }
  if (input.status !== undefined || input.images !== undefined) {
    assertActivatable(input.status ?? current.status, input.images ?? current.images);
  }

  await assertReferences(
    input.categoryId !== current.categoryId ? input.categoryId : undefined,
    input.brandId !== current.brandId ? input.brandId : undefined,
  );
  await assertNoConflicts(
    {
      slug: input.slug !== undefined && input.slug !== current.slug ? input.slug : undefined,
      sku: input.sku !== undefined && input.sku !== current.sku ? input.sku : undefined,
    },
    id,
  );

  try {
    return serializeProduct(await updateProductRecord(id, input));
  } catch (error) {
    return rethrowUniqueConflict(error);
  }
}

async function remove(id: string) {
  await getById(id);
  const result = await deleteOrArchiveProduct(id);
  return { id, ...result };
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