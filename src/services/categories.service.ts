import axios from "axios";

export interface CategoryItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  parent?: { id: string; nameAr: string; nameEn: string } | null;
  createdAt?: string;
  _count?: { products: number; children?: number };
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

// ---------------------------------------------------------------------------
// أنواع لوحة الإدارة
// ---------------------------------------------------------------------------

export type AdminCategorySort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "products_desc"
  | "products_asc";

export type CategoryScope = "root" | "child";

export interface AdminCategoriesQuery {
  q?: string;
  scope?: CategoryScope;
  sort?: AdminCategorySort;
  page?: number;
  limit?: number;
}

export interface AdminCategoryListItem extends CategoryItem {
  createdAt: string;
  parent: { id: string; nameAr: string; nameEn: string } | null;
  _count: { products: number; children: number };
}

export interface AdminCategoriesMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: { ALL: number; ROOT: number; CHILD: number };
}

export interface AdminCategoriesResponse {
  success: boolean;
  data: AdminCategoryListItem[];
  meta: AdminCategoriesMeta;
}

export interface CategoryOption {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  parentId: string | null;
}

export interface CategoryPayload {
  nameAr: string;
  nameEn: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
}

const PUBLIC_BASE = "/api/categories";
const ADMIN_BASE = "/api/admin/categories";

export const categoriesService = {
  async list(params: { q?: string; page?: number; limit?: number } = {}) {
    const { data } = await axios.get<ApiListResponse<CategoryItem>>(PUBLIC_BASE, { params });
    return data;
  },

  async getBySlug(slug: string) {
    const { data } = await axios.get<ApiItemResponse<CategoryItem>>(`${PUBLIC_BASE}/${slug}`);
    return data.data;
  },

  async adminList(params: AdminCategoriesQuery = {}) {
    const { data } = await axios.get<AdminCategoriesResponse>(ADMIN_BASE, { params });
    return data;
  },

  async adminOptions() {
    const { data } = await axios.get<ApiItemResponse<CategoryOption[]>>(`${ADMIN_BASE}/options`);
    return data.data;
  },

  async adminGetById(id: string) {
    const { data } = await axios.get<ApiItemResponse<CategoryItem>>(`${ADMIN_BASE}/${id}`);
    return data.data;
  },

  async create(payload: CategoryPayload) {
    const { data } = await axios.post<ApiItemResponse<CategoryItem>>(ADMIN_BASE, payload);
    return data.data;
  },

  async update(id: string, payload: Partial<CategoryPayload>) {
    const { data } = await axios.patch<ApiItemResponse<CategoryItem>>(
      `${ADMIN_BASE}/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string) {
    const { data } = await axios.delete<ApiItemResponse<{ id: string; deleted: boolean }>>(
      `${ADMIN_BASE}/${id}`,
    );
    return data.data;
  },
};