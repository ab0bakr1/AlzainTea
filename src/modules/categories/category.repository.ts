import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListCategoriesQuery } from "./category.validators";

export const categoryRepository = {
  async findMany(filters: ListCategoriesQuery) {
    const where: Prisma.CategoryWhereInput = filters.q
      ? {
          OR: [
            { nameAr: { contains: filters.q, mode: "insensitive" } },
            { nameEn: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {};

    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit,
        include: {
          _count: { select: { products: true } },
          parent: { select: { id: true, nameAr: true, nameEn: true } },
        },
      }),
      prisma.category.count({ where }),
    ]);

    return { items, total };
  },

  async findAllFlat() {
    // لقوائم الاختيار (Select) في نموذج المنتج
    return prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameAr: true, nameEn: true, slug: true },
    });
  },

  async findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: { children: true },
    });
  },

  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
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