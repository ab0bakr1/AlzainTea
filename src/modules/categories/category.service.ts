import { categoryRepository } from "./category.repository";
import { ApiError } from "@/lib/api-response";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from "./category.validators";

export const categoryService = {
  async list(filters: ListCategoriesQuery) {
    const { items, total } = await categoryRepository.findMany(filters);
    return {
      items,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  },

  async listAllForSelect() {
    return categoryRepository.findAllFlat();
  },

  async getBySlug(slug: string) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new ApiError("NOT_FOUND", "الفئة غير موجودة", 404);
    }
    return category;
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new ApiError("NOT_FOUND", "الفئة غير موجودة", 404);
    }
    return category;
  },

  async create(input: CreateCategoryInput) {
    if (await categoryRepository.slugExists(input.slug)) {
      throw new ApiError("CONFLICT", "هذا الـ slug مستخدم مسبقًا لفئة أخرى", 409);
    }

    if (input.parentId) {
      const parent = await categoryRepository.findById(input.parentId);
      if (!parent) {
        throw new ApiError("VALIDATION_ERROR", "الفئة الأب غير موجودة", 400);
      }
    }

    return categoryRepository.create({
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      slug: input.slug,
      description: input.description ?? null,
      image: input.image ?? null,
      parentId: input.parentId ?? null,
    });
  },

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "الفئة غير موجودة", 404);
    }

    if (input.slug && (await categoryRepository.slugExists(input.slug, id))) {
      throw new ApiError("CONFLICT", "هذا الـ slug مستخدم مسبقًا لفئة أخرى", 409);
    }

    if (input.parentId === id) {
      throw new ApiError("VALIDATION_ERROR", "لا يمكن أن تكون الفئة أبًا لنفسها", 400);
    }

    return categoryRepository.update(id, input);
  },

  async remove(id: string) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "الفئة غير موجودة", 404);
    }

    const productsCount = await categoryRepository.countProducts(id);
    if (productsCount > 0) {
      throw new ApiError(
        "CONFLICT",
        `لا يمكن حذف هذه الفئة لأنها تحتوي على ${productsCount} منتج، انقل المنتجات أولاً`,
        409
      );
    }

    return categoryRepository.delete(id);
  },
};