// src/app/(shop)/products/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useProducts } from "@/hooks/useProducts";
import { useProductFiltersUrl } from "@/hooks/useProductFiltersUrl";
import { ProductSearch } from "@/components/shop/ProductSearch";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { Pagination } from "@/components/shop/Pagination";
import { ProductGrid } from "@/components/shop/ProductGrid"; // موجود مسبقًا حسب CLAUDE.md

interface FacetsResponse {
  success: true;
  data: {
    categories: { slug: string; nameAr: string; nameEn: string; _count: { products: number } }[];
    minPrice: number;
    maxPrice: number;
  };
}

async function fetchFacets(params: URLSearchParams) {
  const { data } = await axios.get<FacetsResponse>(`/api/products/facets?${params.toString()}`);
  return data.data;
}

export default function ProductsPage() {
  const t = useTranslations("products");
  const { filters } = useProductFiltersUrl();
  const { data, isLoading, isError } = useProducts(filters);

  // الفلاتر المتاحة (الفئات وحدود السعر) — تُبنى من نفس الاستعلام الحالي بدون category/brand
  const facetsParams = new URLSearchParams();
  if (filters.q) facetsParams.set("q", filters.q);
  if (filters.minPrice) facetsParams.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) facetsParams.set("maxPrice", String(filters.maxPrice));

  const { data: facets } = useQuery({
    queryKey: ["product-facets", filters.q, filters.minPrice, filters.maxPrice],
    queryFn: () => fetchFacets(facetsParams),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title", { default: "منتجاتنا" })}</h1>

      <div className="mb-6">
        <ProductSearch />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <ProductFilters
          categories={facets?.categories ?? []}
          priceBounds={{ min: facets?.minPrice ?? 0, max: facets?.maxPrice ?? 0 }}
        />

        <div>
          {isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {isError && (
            <p className="py-12 text-center text-sm text-destructive">
              {t("loadError", { default: "تعذّر تحميل المنتجات، حاول مرة أخرى" })}
            </p>
          )}

          {!isLoading && !isError && data && (
            <>
              {data.data.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("noResults", { default: "لا توجد منتجات مطابقة لبحثك" })}
                </p>
              ) : (
                <ProductGrid products={data.data} />
              )}

              <div className="mt-8">
                <Pagination
                  currentPage={data.meta.page}
                  totalPages={data.meta.totalPages}
                  hasNextPage={data.meta.hasNextPage}
                  hasPrevPage={data.meta.hasPrevPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}