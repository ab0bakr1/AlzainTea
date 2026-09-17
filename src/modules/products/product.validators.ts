// src/modules/products/product.validators.ts
import { z } from "zod";

export const productSortSchema = z.enum([
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "popular",
]);

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().optional(), // slug الفئة
  brand: z.string().optional(), // slug الماركة
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: productSortSchema.default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(48).default(12),
}).refine(
  (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
  { message: "الحد الأدنى للسعر يجب ألا يتجاوز الحد الأقصى", path: ["minPrice"] }
);

export type ProductQuery = z.infer<typeof productQuerySchema>;