// src/modules/products/product.validators.ts
import { z } from "zod";

/** حد تنبيه المخزون المنخفض. المتاح للبيع = stock - reservedStock */
export const LOW_STOCK_THRESHOLD = 5;

// ============================================================================
// الواجهة العامة (Public Storefront) — بدون تغيير
// ============================================================================

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

// ============================================================================
// استعلام قائمة المنتجات في الإدارة
// ============================================================================

export const adminProductSortSchema = z.enum([
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "name_asc",
  "stock_asc",
  "stock_desc",
]);

/** low = متاح للبيع بين 1 وحد التنبيه، out = متاح للبيع صفر أو أقل */
export const adminStockFilterSchema = z.enum(["low", "out"]);

export const adminProductsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(), // slug الفئة
  status: productStatusSchema.optional(),
  stock: adminStockFilterSchema.optional(),
  sort: adminProductSortSchema.default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// الكتابة (إنشاء / تعديل)
// ============================================================================

// السعر في قاعدة البيانات Decimal(10,2): خانتان عشريتان كحد أقصى
const hasMaxTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

const priceSchema = z.coerce
  .number()
  .positive("السعر يجب أن يكون أكبر من صفر")
  .max(9_999_999, "السعر مرتفع جداً")
  .refine(hasMaxTwoDecimals, "السعر يقبل خانتين عشريتين كحد أقصى");

const stockSchema = z.coerce
  .number()
  .int("المخزون يجب أن يكون عدداً صحيحاً")
  .nonnegative("المخزون لا يقبل قيماً سالبة")
  .max(1_000_000, "قيمة المخزون مرتفعة جداً");

// روابط http(s) أو مسارات داخلية فقط (يمنع javascript: و data:)
const imageUrlSchema = z
  .string()
  .trim()
  .max(2048, "رابط الصورة طويل جداً")
  .regex(/^(https?:\/\/|\/)\S+$/, "رابط الصورة غير صالح (يجب أن يبدأ بـ https:// أو /)");

const variantInputSchema = z.object({
  /** موجود عند تعديل متغير قائم، وغائب عند إضافة متغير جديد */
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "اسم المتغير مطلوب").max(100, "اسم المتغير طويل جداً"),
  sku: z.string().trim().min(1, "SKU المتغير مطلوب").max(64, "SKU المتغير طويل جداً"),
  price: priceSchema.nullable().optional(),
  /** بدون default عمداً: الغياب عند التعديل = لا تغيّر المخزون الحالي */
  stock: stockSchema.optional(),
});

const variantsSchema = z
  .array(variantInputSchema)
  .max(30, "الحد الأقصى 30 متغيراً")
  .refine(
    (list) => new Set(list.map((v) => v.sku.toLowerCase())).size === list.length,
    "رموز SKU للمتغيرات يجب أن تكون فريدة",
  );

// الحقول الإلزامية عند الإنشاء
const requiredShape = {
  nameAr: z.string().trim().min(2, "الاسم بالعربية مطلوب").max(150, "الاسم بالعربية طويل جداً"),
  nameEn: z.string().trim().min(2, "الاسم بالإنجليزية مطلوب").max(150, "الاسم بالإنجليزية طويل جداً"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "الـ slug طويل جداً")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الـ slug يجب أن يكون بحروف إنجليزية صغيرة وأرقام وشرطات"),
  descAr: z.string().trim().min(1, "الوصف بالعربية مطلوب").max(5000, "الوصف بالعربية طويل جداً"),
  descEn: z.string().trim().min(1, "الوصف بالإنجليزية مطلوب").max(5000, "الوصف بالإنجليزية طويل جداً"),
  price: priceSchema,
  sku: z.string().trim().min(1, "SKU مطلوب").max(64, "SKU طويل جداً"),
  categoryId: z.string().trim().min(1, "الفئة مطلوبة"),
};

// الحقول الاختيارية — بدون .default() عمداً (راجع الملاحظة أسفل الملف)
const optionalShape = {
  compareAtPrice: priceSchema.nullable(),
  stock: stockSchema,
  images: z.array(imageUrlSchema).max(10, "الحد الأقصى 10 صور"),
  status: productStatusSchema,
  brandId: z.string().trim().min(1).nullable(),
};

export const createProductSchema = z.object({
  ...requiredShape,
  compareAtPrice: optionalShape.compareAtPrice.optional(),
  stock: optionalShape.stock.default(0),
  images: optionalShape.images.default([]),
  status: optionalShape.status.default("DRAFT"),
  brandId: optionalShape.brandId.optional(),
  variants: variantsSchema.optional(),
});

/**
 * التعديل (PATCH): كل الحقول اختيارية.
 *
 * ملاحظة مهمة: في Zod 4 تُطبَّق قيم .default() داخل الحقول الاختيارية، لذلك كان
 * `createProductSchema.partial()` يعيد ضبط status إلى DRAFT و stock إلى 0 و images إلى []
 * عند أي PATCH جزئي. الحل: بناء مخطط التعديل من شكل خالٍ من الـ defaults.
 */
export const updateProductSchema = z
  .object({
    ...requiredShape,
    ...optionalShape,
    variants: variantsSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "لا توجد حقول للتعديل");

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type AdminProductsQuery = z.infer<typeof adminProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;