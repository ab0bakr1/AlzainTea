// src/components/shop/ProductFilters.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useProductFiltersUrl } from "@/hooks/useProductFiltersUrl";
import type { ProductFiltersState } from "@/hooks/useProducts";

interface CategoryFacet {
  slug: string;
  nameAr: string;
  nameEn: string;
  _count: { products: number };
}

interface ProductFiltersProps {
  categories: CategoryFacet[];
  priceBounds: { min: number; max: number };
}

const SORT_OPTIONS: { value: NonNullable<ProductFiltersState["sort"]>; labelAr: string; labelEn: string }[] = [
  { value: "newest", labelAr: "الأحدث", labelEn: "Newest" },
  { value: "popular", labelAr: "الأكثر رواجًا", labelEn: "Popular" },
  { value: "price_asc", labelAr: "السعر: من الأقل", labelEn: "Price: Low to High" },
  { value: "price_desc", labelAr: "السعر: من الأعلى", labelEn: "Price: High to Low" },
  { value: "name_asc", labelAr: "الاسم (أ-ي)", labelEn: "Name (A-Z)" },
];

export function ProductFilters({ categories, priceBounds }: ProductFiltersProps) {
  const t = useTranslations("products");
  const locale = useLocale();
  const isAr = locale === "ar";
  const { filters, updateFilters, resetFilters } = useProductFiltersUrl();

  const hasActiveFilters = Boolean(
    filters.category || filters.brand || filters.minPrice || filters.maxPrice || filters.q
  );

  return (
    <aside className="space-y-6" aria-label={t("filtersTitle", { default: "الفلاتر" })}>
      {/* الترتيب */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          {t("sortBy", { default: "ترتيب حسب" })}
        </label>
        <select
          value={filters.sort ?? "newest"}
          onChange={(e) => updateFilters({ sort: e.target.value as ProductFiltersState["sort"] })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {isAr ? opt.labelAr : opt.labelEn}
            </option>
          ))}
        </select>
      </div>

      {/* الفئات */}
      <div>
        <h3 className="mb-2 text-sm font-medium">{t("categories", { default: "الفئات" })}</h3>
        <ul className="space-y-1.5">
          {categories.map((cat) => {
            const active = filters.category === cat.slug;
            return (
              <li key={cat.slug}>
                <button
                  type="button"
                  onClick={() => updateFilters({ category: active ? undefined : cat.slug })}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span>{isAr ? cat.nameAr : cat.nameEn}</span>
                  <span className="text-xs text-muted-foreground">{cat._count.products}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* نطاق السعر */}
      <div>
        <h3 className="mb-2 text-sm font-medium">
          {t("priceRange", { default: "نطاق السعر (USD)" })}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={priceBounds.min}
            max={priceBounds.max}
            placeholder={String(priceBounds.min)}
            defaultValue={filters.minPrice}
            onBlur={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number"
            min={priceBounds.min}
            max={priceBounds.max}
            placeholder={String(priceBounds.max)}
            defaultValue={filters.maxPrice}
            onBlur={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("clearFilters", { default: "مسح كل الفلاتر" })}
        </button>
      )}
    </aside>
  );
}