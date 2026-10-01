"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ProductCard } from "./ProductCard";
import { productsService } from "@/services/products.service";

// مطابقة لـ productSortSchema في product.validators.ts
const SORTS = ["newest", "popular", "price_asc", "price_desc", "name_asc"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 12;

const COPY = {
  ar: {
    sort: "الترتيب",
    newest: "الأحدث",
    popular: "الأكثر رواجاً",
    price_asc: "السعر: الأقل أولاً",
    price_desc: "السعر: الأعلى أولاً",
    name_asc: "الاسم (أ - ي)",
    count: (n: number) => `${n} منتج`,
    emptyTitle: "لا توجد منتجات في هذه الفئة حالياً",
    emptyBody: "تصفّح بقية الأقسام أو عُد لاحقاً.",
    reset: "العودة للبداية",
    errorTitle: "تعذّر تحميل المنتجات",
    errorBody: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: "إعادة المحاولة",
    prev: "السابق",
    next: "التالي",
    page: (p: number, t: number) => `صفحة ${p} من ${t}`,
  },
  en: {
    sort: "Sort by",
    newest: "Newest",
    popular: "Most popular",
    price_asc: "Price: low to high",
    price_desc: "Price: high to low",
    name_asc: "Name (A - Z)",
    count: (n: number) => `${n} ${n === 1 ? "product" : "products"}`,
    emptyTitle: "No products in this category yet",
    emptyBody: "Browse other categories or check back soon.",
    reset: "Back to start",
    errorTitle: "Couldn't load products",
    errorBody: "Check your connection and try again.",
    retry: "Try again",
    prev: "Previous",
    next: "Next",
    page: (p: number, t: number) => `Page ${p} of ${t}`,
  },
} as const;

const btn =
  "rounded-[var(--radius-md)] border border-[var(--color-form)] bg-[var(--color-bg-alt)] px-4 py-2 text-sm text-[var(--color-text-primary)] transition-opacity hover:opacity-[var(--state-hover-opacity)] disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]";

export default function CategoryProducts({ slug }: { slug: string }) {
  const t = useLocale() === "en" ? COPY.en : COPY.ar;

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const rawSort = sp.get("sort") as Sort | null;
  const sort: Sort = rawSort && SORTS.includes(rawSort) ? rawSort : "newest";

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const query = useQuery({
    queryKey: ["category-products", slug, page, sort],
    queryFn: () => productsService.list({ category: slug, sort, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  const canReset = sort !== "newest" || page > 1;

  return (
    <section aria-label="products">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--color-form)] py-4">
        <p className="text-sm text-[var(--color-text-secondary)]" aria-live="polite">
          {meta ? t.count(meta.total) : "\u00A0"}
        </p>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          {t.sort}
          <select
            value={sort}
            onChange={(e) =>
              setParams({ sort: e.target.value === "newest" ? null : e.target.value, page: null })
            }
            className="rounded-[var(--radius-md)] border border-[var(--color-form)] bg-[var(--color-form)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-xl)] border border-[var(--color-form)] p-10 text-center"
        >
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t.errorTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t.errorBody}</p>
          <button type="button" onClick={() => query.refetch()} className={`${btn} mt-5`}>
            {t.retry}
          </button>
        </div>
      ) : query.isLoading ? (
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="space-y-3 p-3">
              <div className="aspect-square animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-form)]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-form)]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-form)]" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-text-disabled)] p-12 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t.emptyTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t.emptyBody}</p>
          {canReset && (
            <button
              type="button"
              onClick={() => setParams({ sort: null, page: null })}
              className={`${btn} mt-5`}
            >
              {t.reset}
            </button>
          )}
        </div>
      ) : (
        <ul
          className={`grid grid-cols-2 gap-4 transition-opacity sm:gap-6 md:grid-cols-3 lg:grid-cols-4 ${
            query.isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label="pagination" className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
            className={btn}
          >
            {t.prev}
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t.page(meta.page, meta.totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setParams({ page: String(page + 1) })}
            className={btn}
          >
            {t.next}
          </button>
        </nav>
      )}
    </section>
  );
}