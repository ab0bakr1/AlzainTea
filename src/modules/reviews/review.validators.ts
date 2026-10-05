import { z } from "zod";

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();

export const createReviewSchema = z.object({
  productId: z.string().min(1, "معرّف المنتج مطلوب"),
  rating: z
    .number({ error: "التقييم مطلوب" })
    .int("التقييم يجب أن يكون رقماً صحيحاً")
    .min(1, "أقل تقييم هو 1")
    .max(5, "أعلى تقييم هو 5"),
  comment: z
    .string()
    .max(1000, "التعليق يجب ألا يتجاوز 1000 حرف")
    .transform(stripHtml)
    .optional(),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ===== الإدارة =====
/** القيم الفارغة القادمة من الـ Query String (?status=) تُعامل كأنها غير موجودة */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const ADMIN_REVIEW_SORTS = ["newest", "oldest", "rating_desc", "rating_asc"] as const;

export const adminListReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(emptyToUndefined, z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()),
  rating: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(5).optional()),
  verified: z
    .preprocess(emptyToUndefined, z.enum(["true", "false"]).optional())
    .transform((v) => (v === undefined ? undefined : v === "true")),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100, "البحث طويل جداً").optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(ADMIN_REVIEW_SORTS).default("newest")),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], { error: "حالة غير صالحة" }),
});

export const bulkReviewsSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "DELETE"], { error: "إجراء غير صالح" }),
  ids: z
    .array(z.string().min(1))
    .min(1, "حدّد مراجعة واحدة على الأقل")
    .max(100, "الحد الأقصى 100 مراجعة في العملية الواحدة")
    .transform((ids) => Array.from(new Set(ids))),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
export type BulkReviewsInput = z.infer<typeof bulkReviewsSchema>;