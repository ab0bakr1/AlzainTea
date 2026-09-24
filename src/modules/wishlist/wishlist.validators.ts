import { z } from "zod";

export const wishlistProductSchema = z.object({
  productId: z.string().min(1, "معرّف المنتج مطلوب"),
});

export const wishlistListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  idsOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type WishlistListQuery = z.infer<typeof wishlistListQuerySchema>;