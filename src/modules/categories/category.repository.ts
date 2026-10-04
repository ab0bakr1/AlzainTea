import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListCategoriesQuery } from "./category.validators";

const ORDER_BY: Record<ListCategoriesQuery["sort"], Prisma.CategoryOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  name_asc: [{ nameAr: "asc" }],
  products_desc: [{ products: { _count: "desc" } }, { createdAt: "desc" }],
  products_asc: [{ products: { _count: "asc" } }, { createdAt: "desc" }],
};

const withMeta = {
  _count: { select: { products: true, children: true } },
  parent: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.CategoryInclude;

export const categoryRepository = {
  async findMany(filters: ListCategoriesQuery) {
    // البحث يُطبَّق على التبويبات (العدادات) أيضاً، أما النطاق scope فلا
    const searchWhere: Prisma.CategoryWhereInput = filters.q
      ? {
          OR: [
            { nameAr: { contains: filters.q, mode: "insensitive" } },
            { nameEn: { contains: filters.q, mode: "insensitive" } },
            { slug: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {};

    const where: Prisma.CategoryWhereInput = {
      ...searchWhere,
      ...(filters.scope === "root" ? { parentId: null } : {}),
      ...(filters.scope === "child" ? { parentId: { not: null } } : {}),
    };

    const skip = (filters.page - 1) * filters.limit;

    const [items, total, allCount, rootCount] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        orderBy: ORDER_BY[filters.sort],
        skip,
        take: filters.limit,
        include: withMeta,
      }),
      prisma.category.count({ where }),
      prisma.category.count({ where: searchWhere }),
      prisma.category.count({ where: { ...searchWhere, parentId: null } }),
    ]);

    return {
      items,
      total,
      counts: { ALL: allCount, ROOT: rootCount, CHILD: allCount - rootCount },
    };
  },

  async findAllFlat() {
    // لقوائم الاختيار (Select) في نموذج المنتج ونموذج الفئة
    return prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameAr: true, nameEn: true, slug: true, parentId: true },
    });
  },

  async findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { nameAr: true, nameEn: true, slug: true } },
        children: { orderBy: { nameEn: "asc" } },
      },
    });
  },

  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },

  async findByIdWithMeta(id: string) {
    return prisma.category.findUnique({ where: { id }, include: withMeta });
  },

  async findParentRef(id: string) {
    return prisma.category.findUnique({ where: { id }, select: { parentId: true } });
  },

  async slugExists(slug: string, excludeId?: string) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    return !!existing && existing.id !== excludeId;
  },

  async create(data: Prisma.CategoryUncheckedCreateInput) {
    return prisma.category.create({ data });
  },

  async update(id: string, data: Prisma.CategoryUncheckedUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },

  async countProducts(id: string) {
    return prisma.product.count({ where: { categoryId: id } });
  },
};