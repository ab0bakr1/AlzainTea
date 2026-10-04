// src/services/products.service.ts
import axios from "axios";

// ============================================================================
// الأنواع العامة (Public) — بدون تغيير
// ============================================================================

export interface ProductListItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  images: string[];
  stock: number;
  reservedStock: number;
  status: string;
  category: { id: string; nameAr: string; nameEn: string; slug: string };
}

export interface ProductFilters {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "popular";
  page?: number;
  limit?: number;
}

// ============================================================================
// أنواع الإدارة
// ============================================================================

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
export type AdminProductSort =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "stock_asc"
  | "stock_desc";
export type AdminStockFilter = "low" | "out";

export interface AdminProductsQuery {
  q?: string;
  category?: string; // slug
  status?: ProductStatus;
  stock?: AdminStockFilter;
  sort?: AdminProductSort;
  page?: number;
  limit?: number;
}

export interface AdminProductListItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  stock: number;
  reservedStock: number;
  availableStock: number;
  variantsCount: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; nameAr: string; nameEn: string; slug: string };
}

export interface AdminProductsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  lowStockThreshold: number;
  counts: { ALL: number; DRAFT: number; ACTIVE: number; ARCHIVED: number; OUT_OF_STOCK: number };
}

export interface AdminProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
}

export interface AdminProductDetail {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descAr: string;
  descEn: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  reservedStock: number;
  availableStock: number;
  sku: string;
  images: string[];
  status: ProductStatus;
  categoryId: string;
  brandId: string | null;
  variants: AdminProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantPayload {
  id?: string;
  name: string;
  sku: string;
  price: number | null;
  /** عند تعديل متغير قائم: يُرسل فقط إن تغيّر، حتى لا نكتب فوق مخزون تغيّر بسبب طلبات جديدة */
  stock?: number;
}

export interface ProductPayload {
  nameAr: string;
  nameEn: string;
  slug: string;
  descAr: string;
  descEn: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string;
  images: string[];
  status: ProductStatus;
  categoryId: string;
  variants: ProductVariantPayload[];
}

interface ApiListResponse<T, M = { page: number; limit: number; total: number; totalPages: number }> {
  success: boolean;
  data: T[];
  meta: M;
}

interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

const PUBLIC_BASE = "/api/products";
const ADMIN_BASE = "/api/admin/products";

/** يحذف القيم الفارغة حتى لا تصل ?q=&status= إلى الخادم */
function cleanParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/** رسالة خطأ آمنة وجاهزة للعرض من استجابة الـ API الموحدة */
export function extractApiError(
  err: unknown,
  fallback = "حدث خطأ غير متوقع، حاول مرة أخرى",
): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { error?: { message?: string } } | undefined)?.error
      ?.message;
    if (message) return message;
    if (err.response?.status === 429) return "طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة";
    if (!err.response) return "تعذّر الاتصال بالخادم، تحقق من الشبكة";
  }
  return fallback;
}

export const productsService = {
  // ------- Public -------
  async list(filters: ProductFilters = {}) {
    const { data } = await axios.get<ApiListResponse<ProductListItem>>(PUBLIC_BASE, {
      params: filters,
    });
    return data;
  },

  async getBySlug(slug: string) {
    const { data } = await axios.get<ApiItemResponse<ProductListItem>>(
      `${PUBLIC_BASE}/${slug}`,
    );
    return data.data;
  },

  // ------- Admin -------
  async adminList(query: AdminProductsQuery = {}) {
    const { data } = await axios.get<ApiListResponse<AdminProductListItem, AdminProductsMeta>>(
      ADMIN_BASE,
      { params: cleanParams(query) },
    );
    return data;
  },

  async adminGetById(id: string) {
    const { data } = await axios.get<ApiItemResponse<AdminProductDetail>>(`${ADMIN_BASE}/${id}`);
    return data.data;
  },

  async create(payload: ProductPayload) {
    const { data } = await axios.post<ApiItemResponse<AdminProductDetail>>(ADMIN_BASE, payload);
    return data.data;
  },

  async update(id: string, payload: Partial<ProductPayload>) {
    const { data } = await axios.patch<ApiItemResponse<AdminProductDetail>>(
      `${ADMIN_BASE}/${id}`,
      payload,
    );
    return data.data;
  },

  /** archived = true عندما يكون المنتج مرتبطاً بطلبات سابقة فيُؤرشف بدل أن يُحذف */
  async remove(id: string) {
    const { data } = await axios.delete<ApiItemResponse<{ id: string; archived: boolean }>>(
      `${ADMIN_BASE}/${id}`,
    );
    return data.data;
  },
};