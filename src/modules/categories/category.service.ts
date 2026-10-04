import { Prisma } from "@prisma/client";
import { categoryRepository } from "./category.repository";
import { ApiError } from "@/lib/api-response";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from "./category.validators";

const MAX_TREE_DEPTH = 20;

/**
 * يتحقق أن الفئة الأب موجودة، وأن اختيارها لا يصنع حلقة في الشجرة
 * (فئة لا تكون أباً لنفسها ولا لأحد أجدادها). يُمرَّر categoryId = null عند الإنشاء.
 */
async function assertValidParent(categoryId: string | null, parentId: string) {
  if (categoryId && parentId === categoryId) {
    throw new ApiError("VALIDATION_ERROR", "لا يمكن أن تكون الفئة أبًا لنفسها", 400);
  }

  const visited = new Set<string>();
  let cursor: string | null = parentId;

  for (let depth = 0; cursor && depth < MAX_TREE_DEPTH; depth++) {
    if (categoryId && cursor === categoryId) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "لا يمكن اختيار فئة فرعية تابعة لهذه الفئة كأب لها",
        400,
      );
    }
    if (visited.has(cursor)) break;
    visited.add(cursor);

    const node = await categoryRepository.findParentRef(cursor);
    if (!node) {
      throw new ApiError("VALIDATION_ERROR", "الفئة الأب غير موجودة", 400);
    }
    cursor = node.parentId;
  }
}

export const categoryService = {
  async list(filters: ListCategoriesQuery) {
    const { items, total, counts } = await categoryRepository.findMany(filters);
    return {
      items,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
        counts,
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
    const category = await categoryRepository.findByIdWithMeta(id);
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
      await assertValidParent(null, input.parentId);
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

    if (input.parentId) {
      await assertValidParent(id, input.parentId);
    }

    return categoryRepository.update(id, input);
  },

  async remove(id: string) {
    const existing = await categoryRepository.findByIdWithMeta(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "الفئة غير موجودة", 404);
    }

    if (existing._count.products > 0) {
      throw new ApiError(
        "CONFLICT",
        `لا يمكن حذف هذه الفئة لأنها تحتوي على ${existing._count.products} منتج، انقل المنتجات أولاً`,
        409,
      );
    }

    if (existing._count.children > 0) {
      throw new ApiError(
        "CONFLICT",
        `لا يمكن حذف هذه الفئة لأن تحتها ${existing._count.children} فئة فرعية، انقلها أو احذفها أولاً`,
        409,
      );
    }

    try {
      return await categoryRepository.delete(id);
    } catch (error) {
      // منتج أُضيف للفئة في اللحظة بين الفحص والحذف
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError("CONFLICT", "لا يمكن حذف هذه الفئة لأنها مرتبطة ببيانات أخرى", 409);
      }
      throw error;
    }
  },
};