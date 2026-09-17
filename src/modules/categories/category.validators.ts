import { z } from "zod";

export const createCategorySchema = z.object({
  nameAr: z.string().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().min(2, "الاسم الإنجليزي مطلوب"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الـ slug يجب أن يكون بأحرف إنجليزية صغيرة وشرطات فقط"),
  description: z.string().optional().nullable(),
  image: z.string().url("رابط صورة غير صالح").optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoriesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;