// src/hooks/useProducts.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ProductFiltersState {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "popular";
  page?: number;
  limit?: number;
}

export interface ProductListItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  availableStock: number;
  category: { nameAr: string; nameEn: string; slug: string };
  brand: { nameAr: string; nameEn: string; slug: string } | null;
}

interface ProductsResponse {
  success: true;
  data: ProductListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function toQueryString(filters: ProductFiltersState) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

async function fetchProducts(filters: ProductFiltersState): Promise<ProductsResponse> {
  const { data } = await axios.get<ProductsResponse>(`/api/products?${toQueryString(filters)}`);
  return data;
}

export function useProducts(filters: ProductFiltersState) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: (previousData) => previousData, // يمنع "وميض" فارغ عند تغيير الصفحة/الفلتر
    staleTime: 30_000,
  });
}