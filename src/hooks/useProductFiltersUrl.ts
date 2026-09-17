// src/hooks/useProductFiltersUrl.ts
"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductFiltersState } from "./useProducts";

const NUMERIC_KEYS = new Set(["minPrice", "maxPrice", "page", "limit"]);

export function useProductFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: ProductFiltersState = useMemo(() => {
    const result: ProductFiltersState = {};
    for (const [key, value] of searchParams.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = NUMERIC_KEYS.has(key) ? Number(value) : value;
    }
    if (!result.page) result.page = 1;
    if (!result.limit) result.limit = 12;
    if (!result.sort) result.sort = "newest";
    return result;
  }, [searchParams]);

  /** يحدّث فلترًا واحدًا أو أكثر، ويصفّر رقم الصفحة تلقائيًا إلا إذا كان التغيير هو الصفحة نفسها */
  const updateFilters = useCallback(
    (patch: Partial<ProductFiltersState>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (!("page" in patch)) {
        params.delete("page"); // أي تغيير فلتر غير الصفحة يرجعنا للصفحة الأولى
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const resetFilters = useCallback(() => router.push(pathname), [pathname, router]);

  return { filters, updateFilters, resetFilters };
}