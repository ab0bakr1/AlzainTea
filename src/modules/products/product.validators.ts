// src/modules/products/product.validators.ts
import { z } from "zod";

export const productSortSchema = z.enum([
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "popular",
]);

const productQueryBase = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().optional(), // slug الفئة
  brand: z.string().optional(), // slug الماركة
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: productSortSchema.default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(48).default(12),
});

const priceRangeRefine = <T extends { minPrice?: number; maxPrice?: number }>(data: T) =>
  data.minPrice === undefined ||
  data.maxPrice === undefined ||
  data.minPrice <= data.maxPrice;

const priceRangeError = {
  message: "الحد الأدنى للسعر يجب ألا يتجاوز الحد الأقصى",
  path: ["minPrice"],
};

export const productQuerySchema = productQueryBase.refine(priceRangeRefine, priceRangeError);

// اسم بديل للتوافق مع الملفات التي تستورد listProductsQuerySchema
export const listProductsQuerySchema = productQuerySchema;

export const productStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]);

// استعلام الإدارة: نفس الفلاتر + الحالة
export const adminProductsQuerySchema = productQueryBase
  .extend({
    status: productStatusSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine(priceRangeRefine, priceRangeError);

const variantSchema = z.object({
  name: z.string().trim().min(1, "اسم المتغير مطلوب"),
  sku: z.string().trim().min(1, "SKU المتغير مطلوب"),
  price: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const createProductSchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم بالعربية مطلوب"),
  nameEn: z.string().trim().min(2, "الاسم بالإنجليزية مطلوب"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الـ slug يجب أن يكون بحروف إنجليزية صغيرة وأرقام وشرطات"),
  descAr: z.string().trim().min(1, "الوصف بالعربية مطلوب"),
  descEn: z.string().trim().min(1, "الوصف بالإنجليزية مطلوب"),
  price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),
  compareAtPrice: z.coerce.number().positive().nullable().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  sku: z.string().trim().min(1, "SKU مطلوب"),
  images: z.array(z.string().min(1)).default([]),
  status: productStatusSchema.default("DRAFT"),
  categoryId: z.string().min(1, "الفئة مطلوبة"),
  brandId: z.string().nullable().optional(),
  variants: z.array(variantSchema).optional(),
});

// التعديل: كل الحقول اختيارية، والمتغيرات تُدار عند الإنشاء فقط
export const updateProductSchema = createProductSchema.omit({ variants: true }).partial();

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type AdminProductsQuery = z.infer<typeof adminProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;