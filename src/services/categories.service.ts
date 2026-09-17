import axios from "axios";

export interface CategoryItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  _count?: { products: number };
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

  async adminList(params: { q?: string; page?: number; limit?: number } = {}) {
    const { data } = await axios.get<ApiListResponse<CategoryItem>>(ADMIN_BASE, { params });
    return data;
  },

  async adminGetById(id: string) {
    const { data } = await axios.get<ApiItemResponse<CategoryItem>>(`${ADMIN_BASE}/${id}`);
    return data.data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await axios.post<ApiItemResponse<CategoryItem>>(ADMIN_BASE, payload);
    return data.data;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await axios.patch<ApiItemResponse<CategoryItem>>(
      `${ADMIN_BASE}/${id}`,
      payload
    );
    return data.data;
  },

  async remove(id: string) {
    const { data } = await axios.delete<ApiItemResponse<{ id: string; deleted: boolean }>>(
      `${ADMIN_BASE}/${id}`
    );
    return data.data;
  },
};