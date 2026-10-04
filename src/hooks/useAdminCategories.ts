"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoriesService,
  type AdminCategoriesQuery,
  type CategoryPayload,
} from "@/services/categories.service";

export const adminCategoriesKeys = {
  list: (query: AdminCategoriesQuery) => ["admin-categories", "list", query] as const,
  options: ["admin-categories", "options"] as const,
};

/**
 * بعد أي تعديل نُبطل كل الاستعلامات المرتبطة بالفئات (قائمة الإدارة، قوائم الاختيار،
 * وقوائم الفئات في نموذج المنتج والمتجر) دون الحاجة لمعرفة مفاتيحها بالتحديد.
 */
function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (query) => JSON.stringify(query.queryKey).toLowerCase().includes("categor"),
    });
}

export function useAdminCategories(query: AdminCategoriesQuery) {
  return useQuery({
    queryKey: adminCategoriesKeys.list(query),
    queryFn: () => categoriesService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

/** قائمة مسطحة بكل الفئات لاختيار الفئة الأب */
export function useAdminCategoryOptions() {
  return useQuery({
    queryKey: adminCategoriesKeys.options,
    queryFn: () => categoriesService.adminOptions(),
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (payload: CategoryPayload) => categoriesService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CategoryPayload> }) =>
      categoriesService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: invalidate,
  });
}