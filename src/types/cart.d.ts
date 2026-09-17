// src/types/cart.d.ts
// أنواع بيانات السلة المستخدمة في المتجر بالكامل (Store, Hooks, API)

export interface CartItem {
  /** معرف المنتج في قاعدة البيانات */
  productId: string;
  /** معرف المتغير (Variant) إن وُجد — مثال: علبة 250غ */
  variantId?: string | null;
  /** الاسم بالعربية (للعرض حسب اللغة الحالية) */
  nameAr: string;
  /** الاسم بالإنجليزية */
  nameEn: string;
  /** slug المنتج للربط بصفحة التفاصيل */
  slug: string;
  /** رابط الصورة المصغرة */
  image: string | null;
  /** السعر بالدولار وقت الإضافة (Snapshot) — يُعاد التحقق منه دائمًا عبر /api/cart/validate */
  price: number;
  /** الكمية المطلوبة */
  quantity: number;
  /** آخر رصيد مخزون معروف لهذا العنصر (يُحدَّث بعد كل validate) */
  knownStock?: number;
}

export interface CartValidationIssue {
  productId: string;
  variantId?: string | null;
  type: "OUT_OF_STOCK" | "PRICE_CHANGED" | "PRODUCT_UNAVAILABLE" | "QUANTITY_CAPPED";
  message: string;
  /** القيمة الجديدة الصحيحة (سعر جديد أو كمية قصوى متاحة) */
  newValue?: number;
}

export interface CartValidationResult {
  valid: boolean;
  issues: CartValidationIssue[];
  /** العناصر بعد التصحيح التلقائي (تعديل الكمية/السعر ليطابق الواقع) */
  items: CartItem[];
  subtotal: number;
}