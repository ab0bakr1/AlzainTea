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

export const adminListReviewsQuerySchema = listReviewsQuerySchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], { error: "حالة غير صالحة" }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;