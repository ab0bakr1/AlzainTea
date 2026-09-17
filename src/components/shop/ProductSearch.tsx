// src/components/shop/ProductSearch.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useProductFiltersUrl } from "@/hooks/useProductFiltersUrl";

const DEBOUNCE_MS = 400;

export function ProductSearch() {
  const t = useTranslations("products");
  const { filters, updateFilters } = useProductFiltersUrl();
  const [value, setValue] = useState(filters.q ?? "");

  // مزامنة الحقل مع الرابط عند التنقل (زر رجوع المتصفح مثلاً)
  useEffect(() => {
    setValue(filters.q ?? "");
  }, [filters.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (value !== (filters.q ?? "")) {
        updateFilters({ q: value || undefined });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder", { default: "ابحث عن شاي..." })}
        className="w-full rounded-full border border-border bg-background py-2.5 ps-9 pe-4 text-sm outline-none transition focus:border-primary"
        aria-label={t("searchLabel", { default: "بحث في المنتجات" })}
      />
    </div>
  );
}