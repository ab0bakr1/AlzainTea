import axios from "axios";

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
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
  page?: number;
  limit?: number;
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

const PUBLIC_BASE = "/api/products";
const ADMIN_BASE = "/api/admin/products";

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
      `${PUBLIC_BASE}/${slug}`
    );
    return data.data;
  },

  // ------- Admin -------
  async adminList(filters: ProductFilters = {}) {
    const { data } = await axios.get<ApiListResponse<ProductListItem>>(ADMIN_BASE, {
      params: filters,
    });
    return data;
  },

  async adminGetById(id: string) {
    const { data } = await axios.get<ApiItemResponse<ProductListItem>>(`${ADMIN_BASE}/${id}`);
    return data.data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await axios.post<ApiItemResponse<ProductListItem>>(ADMIN_BASE, payload);
    return data.data;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await axios.patch<ApiItemResponse<ProductListItem>>(
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