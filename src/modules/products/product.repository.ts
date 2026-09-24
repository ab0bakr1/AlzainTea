// src/modules/products/product.repository.ts
// استعلامات Prisma الخاصة بالمنتجات تعيش هنا فقط — ممنوع استدعاء Prisma
// مباشرة من الـ Route Handler أو من الـ Service (راجع مسؤولية الطبقات، البند 3).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ProductQuery,
  AdminProductsQuery,
  CreateProductInput,
  UpdateProductInput,
} from "./product.validators";

// ============================================================================
// الواجهة العامة (Public Storefront)
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
// تفاصيل المنتج + الإدارة (Product Detail & Admin)
// ============================================================================

const productInclude = {
  category: true,
  brand: true,
  variants: true,
} satisfies Prisma.ProductInclude;

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: productInclude });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude });
}

export async function findManyAdminProducts(query: AdminProductsQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.q
      ? {
          OR: [
            { nameAr: { contains: query.q, mode: "insensitive" } },
            { nameEn: { contains: query.q, mode: "insensitive" } },
            { sku: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

export function createProductRecord(input: CreateProductInput) {
  const { variants, ...data } = input;
  return prisma.product.create({
    data: {
      ...data,
      ...(variants?.length
        ? { variants: { create: variants.map((v) => ({ ...v, price: v.price ?? null })) } }
        : {}),
    },
    include: productInclude,
  });
}

export function updateProductRecord(id: string, input: UpdateProductInput) {
  return prisma.product.update({ where: { id }, data: input, include: productInclude });
}

export async function deleteOrArchiveProduct(id: string) {
  const usedInOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (usedInOrders > 0) {
    // منتج مرتبط بطلبات: لا يُحذف حفاظاً على السجل المحاسبي، يُؤرشف بدلاً من ذلك
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    return { archived: true };
  }
  await prisma.product.delete({ where: { id } });
  return { archived: false };
}