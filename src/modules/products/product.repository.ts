// src/modules/products/product.repository.ts
// استعلامات Prisma الخاصة بالمنتجات تعيش هنا فقط — ممنوع استدعاء Prisma
// مباشرة من الـ Route Handler أو من الـ Service (راجع مسؤولية الطبقات، البند 3).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import {
  LOW_STOCK_THRESHOLD,
  type ProductQuery,
  type AdminProductsQuery,
  type CreateProductInput,
  type UpdateProductInput,
  type VariantInput,
} from "./product.validators";

// ============================================================================
// الواجهة العامة (Public Storefront) — بدون تغيير
// ============================================================================

function buildWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE", // الواجهة العامة لا تعرض إلا المنتجات المفعّلة
  };

  if (query.category) {
    where.category = { slug: query.category };
  }

  if (query.brand) {
    where.brand = { slug: query.brand };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.q) {
    where.OR = [
      { nameAr: { contains: query.q, mode: "insensitive" } },
      { nameEn: { contains: query.q, mode: "insensitive" } },
      { descAr: { contains: query.q, mode: "insensitive" } },
      { descEn: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ProductQuery["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "name_asc":
      return { nameEn: "asc" };
    case "popular":
      // مؤقتًا نعتمد الأحدث كتقريب للشعبية إلى حين إضافة عداد مبيعات فعلي (V2)
      return { createdAt: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

/** أعمدة العرض في القوائم — لا نُحمّل حقولاً غير ضرورية (descAr/descEn الطويلة مثلاً) */
const listSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  images: true,
  stock: true,
  reservedStock: true,
  status: true,
  category: { select: { nameAr: true, nameEn: true, slug: true } },
  brand: { select: { nameAr: true, nameEn: true, slug: true } },
} satisfies Prisma.ProductSelect;

export async function findManyProducts(query: ProductQuery) {
  const where = buildWhere(query);
  const orderBy = buildOrderBy(query.sort);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: listSelect,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

/** لبناء خيارات الفلترة (الفئات/الماركات المتاحة فعليًا ضمن نتائج البحث الحالي) */
export async function getAvailableFacets(query: ProductQuery) {
  const where = buildWhere({ ...query, category: undefined, brand: undefined });

  const [categories, priceRange] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: where } },
      select: { slug: true, nameAr: true, nameEn: true, _count: { select: { products: true } } },
    }),
    prisma.product.aggregate({
      where,
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  return {
    categories,
    minPrice: priceRange._min.price ? Number(priceRange._min.price) : 0,
    maxPrice: priceRange._max.price ? Number(priceRange._max.price) : 0,
  };
}

// ============================================================================
// تفاصيل المنتج
// ============================================================================

const productInclude = {
  category: true,
  brand: true,
  variants: { orderBy: { name: "asc" } },
} satisfies Prisma.ProductInclude;

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: productInclude });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude });
}

// ============================================================================
// الإدارة — القائمة
// ============================================================================

/** أعمدة الجدول الإداري: بدون الأوصاف الطويلة */
const adminListSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  slug: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  images: true,
  stock: true,
  reservedStock: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

/**
 * Prisma لا يدعم شرط (stock - reservedStock) في where، لذلك نجلب المعرفات بـ SQL
 * مُعلَّم (tagged template — معاملات مرتبطة وليس Unsafe) ثم نفلتر بها.
 */
async function findStockFilterIds(filter: "low" | "out"): Promise<string[]> {
  const rows =
    filter === "out"
      ? await prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT "id" FROM "Product" WHERE "stock" - "reservedStock" <= 0`,
        )
      : await prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT "id" FROM "Product"
                     WHERE "stock" - "reservedStock" > 0
                       AND "stock" - "reservedStock" <= ${LOW_STOCK_THRESHOLD}`,
        );
  return rows.map((r) => r.id);
}

async function buildAdminWhere(query: AdminProductsQuery): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [];

  if (query.status) and.push({ status: query.status });
  if (query.category) and.push({ category: { slug: query.category } });
  if (query.q) {
    and.push({
      OR: [
        { nameAr: { contains: query.q, mode: "insensitive" } },
        { nameEn: { contains: query.q, mode: "insensitive" } },
        { sku: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.stock) and.push({ id: { in: await findStockFilterIds(query.stock) } });

  return and.length ? { AND: and } : {};
}

function buildAdminOrderBy(sort: AdminProductsQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  // id كمفتاح ترتيب ثانوي لثبات الترقيم عند تساوي القيم
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "name_asc":
      return [{ nameEn: "asc" }, { id: "asc" }];
    case "stock_asc":
      return [{ stock: "asc" }, { id: "asc" }];
    case "stock_desc":
      return [{ stock: "desc" }, { id: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

/** عدادات التبويبات (إجمالية، لا تتأثر بالبحث الحالي) */
export async function countProductsByStatus() {
  const rows = await prisma.product.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = { ALL: 0, DRAFT: 0, ACTIVE: 0, ARCHIVED: 0, OUT_OF_STOCK: 0 };
  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }
  return counts;
}

export async function findManyAdminProducts(query: AdminProductsQuery) {
  const where = await buildAdminWhere(query);

  const [items, total, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      select: adminListSelect,
      orderBy: buildAdminOrderBy(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.product.count({ where }),
    countProductsByStatus(),
  ]);

  return { items, total, counts };
}

// ============================================================================
// الإدارة — فحوصات مسبقة (رسائل واضحة بدل P2002/P2003 العامة)
// ============================================================================

export async function findProductConflicts(
  input: { slug?: string; sku?: string },
  excludeId?: string,
) {
  const or: Prisma.ProductWhereInput[] = [];
  if (input.slug) or.push({ slug: input.slug });
  if (input.sku) or.push({ sku: input.sku });
  if (or.length === 0) return { slug: false, sku: false };

  const rows = await prisma.product.findMany({
    where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true, sku: true },
  });

  return {
    slug: !!input.slug && rows.some((r) => r.slug === input.slug),
    sku: !!input.sku && rows.some((r) => r.sku === input.sku),
  };
}

export async function categoryExists(id: string) {
  return (await prisma.category.count({ where: { id } })) > 0;
}

export async function brandExists(id: string) {
  return (await prisma.brand.count({ where: { id } })) > 0;
}

// ============================================================================
// الإدارة — الكتابة
// ============================================================================

export function createProductRecord(input: CreateProductInput) {
  const { variants, ...data } = input;
  return prisma.product.create({
    data: {
      ...data,
      ...(variants?.length
        ? {
            variants: {
              create: variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price ?? null,
                stock: v.stock ?? 0,
              })),
            },
          }
        : {}),
    },
    include: productInclude,
  });
}

/**
 * مزامنة المتغيرات مع القائمة المرسلة (داخل معاملة المنتج):
 * - بمعرّف  → تعديل (والمخزون يُعدَّل فقط إن أُرسل)
 * - بدون معرّف → إنشاء
 * - غير موجود في القائمة → حذف، ما لم يكن مرتبطاً بطلبات سابقة (يُرفض الحذف)
 */
async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  variants: VariantInput[],
) {
  const existing = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((v) => v.id));

  for (const v of variants) {
    if (v.id && !existingIds.has(v.id)) {
      throw new ApiError("VARIANT_NOT_FOUND", "أحد المتغيرات المرسلة لا يتبع هذا المنتج", 422);
    }
  }

  const keepIds = new Set(variants.flatMap((v) => (v.id ? [v.id] : [])));
  const removeIds = existing.map((v) => v.id).filter((id) => !keepIds.has(id));

  if (removeIds.length > 0) {
    const used = await tx.orderItem.count({ where: { variantId: { in: removeIds } } });
    if (used > 0) {
      throw new ApiError(
        "VARIANT_IN_USE",
        "لا يمكن حذف متغير مرتبط بطلبات سابقة. اتركه وصفّر مخزونه بدلاً من ذلك",
        409,
      );
    }
    await tx.productVariant.deleteMany({ where: { id: { in: removeIds } } });
  }

  for (const v of variants) {
    if (v.id) {
      await tx.productVariant.update({
        where: { id: v.id },
        data: {
          name: v.name,
          sku: v.sku,
          price: v.price ?? null,
          ...(v.stock !== undefined ? { stock: v.stock } : {}),
        },
      });
    } else {
      await tx.productVariant.create({
        data: { productId, name: v.name, sku: v.sku, price: v.price ?? null, stock: v.stock ?? 0 },
      });
    }
  }
}

export function updateProductRecord(id: string, input: UpdateProductInput) {
  const { variants, ...data } = input;
  return prisma.$transaction(
    async (tx) => {
      await tx.product.update({ where: { id }, data }); // يحدّث updatedAt حتى لو تغيّرت المتغيرات فقط
      if (variants) await syncVariants(tx, id, variants);
      return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    },
    { timeout: 10_000 },
  );
}

/**
 * منتج مرتبط بطلبات سابقة: يُؤرشف حفاظاً على السجل المحاسبي، وإلا يُحذف نهائياً.
 * P2003 = طلب أُنشئ بالتزامن بين الفحص والحذف → نؤرشف بدل الفشل.
 */
export async function deleteOrArchiveProduct(id: string) {
  const archive = async () => {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    return { archived: true };
  };

  const usedInOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (usedInOrders > 0) return archive();

  try {
    await prisma.product.delete({ where: { id } });
    return { archived: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return archive();
    }
    throw error;
  }
}