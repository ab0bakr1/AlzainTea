// src/hooks/useAdminProducts.ts
"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "@/services/categories.service";
import {
  productsService,
  type AdminProductsQuery,
  type ProductPayload,
} from "@/services/products.service";

export const adminProductKeys = {
  all: ["admin-products"] as const,
  list: (query: AdminProductsQuery) => ["admin-products", "list", query] as const,
  detail: (id: string) => ["admin-products", "detail", id] as const,
};

export function useAdminProducts(query: AdminProductsQuery) {
  return useQuery({
    queryKey: adminProductKeys.list(query),
    queryFn: () => productsService.adminList(query),
    placeholderData: keepPreviousData, // لا وميض فارغ عند تغيير الصفحة أو الفلتر
    staleTime: 15_000,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminProductKeys.detail(id),
    queryFn: () => productsService.adminGetById(id),
    enabled: !!id,
    // النموذج يأخذ قيمه الابتدائية مرة واحدة، لذا لا نعيد استخدام نسخة قديمة من الكاش
    // ولا نعيد الجلب عند العودة للنافذة (حتى لا تُستبدل بيانات يكتبها المدير الآن)
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** خيارات الفئات للـ Select (نموذج المنتج وفلتر الجدول) */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ["admin-category-options"],
    queryFn: async () => (await categoriesService.list({ limit: 100 })).data,
    staleTime: 5 * 60_000,
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["products"] }), // كتالوج المتجر العام
    ]);
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: ProductPayload) => productsService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductPayload> }) =>
      productsService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: invalidate,
  });
}