import { z } from "zod";

// النصوص الفارغة القادمة من النماذج تُعامل كـ null
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

// يقبل رابطاً مطلقاً http(s) أو مساراً محلياً يبدأ بـ "/" (ويرفض javascript: و //host)
const imageSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(500, "رابط الصورة طويل جداً")
    .refine(
      (value) =>
        /^https?:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//")),
      "رابط الصورة يجب أن يبدأ بـ https:// أو /",
    )
    .nullable()
    .optional(),
);

export const createCategorySchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم العربي مطلوب").max(100, "الاسم العربي طويل جداً"),
  nameEn: z.string().trim().min(2, "الاسم الإنجليزي مطلوب").max(100, "الاسم الإنجليزي طويل جداً"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "الـ slug قصير جداً")
    .max(120, "الـ slug طويل جداً")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الـ slug يجب أن يكون بأحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "الوصف يجب ألا يتجاوز 500 حرف").nullable().optional(),
  ),
  image: imageSchema,
  parentId: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
});

export const updateCategorySchema = createCategorySchema.partial();

export const CATEGORY_SORTS = [
  "newest",
  "oldest",
  "name_asc",
  "products_desc",
  "products_asc",
] as const;

export const CATEGORY_SCOPES = ["root", "child"] as const;

export const listCategoriesQuerySchema = z.object({
  q: z.string().trim().optional(),
  // root = الفئات الرئيسية فقط، child = الفئات الفرعية فقط
  scope: z.enum(CATEGORY_SCOPES).optional(),
  sort: z.enum(CATEGORY_SORTS).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;