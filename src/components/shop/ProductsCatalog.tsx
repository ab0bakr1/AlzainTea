"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";

/* -------------------------------------------------------------------------- */
/* Types (متوافقة مع صيغة الاستجابة الموحدة { success, data, meta })          */
/* -------------------------------------------------------------------------- */

type Meta = { page: number; totalPages: number; total: number };

type FacetCategory = {
  id?: string;
  slug: string;
  nameAr?: string;
  nameEn?: string;
  count?: number;
};

type Facets = {
  categories: FacetCategory[];
  minPrice: number;
  maxPrice: number;
};

const PAGE_SIZE = 12;
const SORTS = ["newest", "bestselling", "price_asc", "price_desc"] as const;
type Sort = (typeof SORTS)[number];

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

const COPY = {
  ar: {
    title: "المنتجات",
    results: (n: number) => `${n} منتج`,
    search: "ابحث عن شاي أو ملحق",
    sort: "الترتيب",
    sorts: {
      newest: "الأحدث",
      bestselling: "الأكثر مبيعاً",
      price_asc: "السعر: من الأقل",
      price_desc: "السعر: من الأعلى",
    },
    filters: "التصفية",
    categories: "الفئات",
    allCategories: "كل الفئات",
    price: "السعر (USD)",
    min: "من",
    max: "إلى",
    apply: "تطبيق",
    inStock: "المتوفر فقط",
    clear: "مسح الكل",
    showResults: "عرض النتائج",
    close: "إغلاق",
    prev: "السابق",
    next: "التالي",
    page: (p: number) => `صفحة ${p}`,
    emptyTitle: "لا توجد منتجات مطابقة",
    emptyBody: "جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر.",
    errorTitle: "تعذّر تحميل المنتجات",
    errorBody: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: "إعادة المحاولة",
    searchChip: (q: string) => `بحث: ${q}`,
    priceChip: (a: string, b: string) => `السعر ${a}–${b}`,
    remove: "إزالة الفلتر",
  },
  en: {
    title: "Products",
    results: (n: number) => `${n} ${n === 1 ? "product" : "products"}`,
    search: "Search teas and accessories",
    sort: "Sort by",
    sorts: {
      newest: "Newest",
      bestselling: "Best selling",
      price_asc: "Price: low to high",
      price_desc: "Price: high to low",
    },
    filters: "Filters",
    categories: "Categories",
    allCategories: "All categories",
    price: "Price (USD)",
    min: "From",
    max: "To",
    apply: "Apply",
    inStock: "In stock only",
    clear: "Clear all",
    showResults: "Show results",
    close: "Close",
    prev: "Previous",
    next: "Next",
    page: (p: number) => `Page ${p}`,
    emptyTitle: "No matching products",
    emptyBody: "Try different keywords or remove some filters.",
    errorTitle: "Couldn't load products",
    errorBody: "Check your connection and try again.",
    retry: "Try again",
    searchChip: (q: string) => `Search: ${q}`,
    priceChip: (a: string, b: string) => `Price ${a}–${b}`,
    remove: "Remove filter",
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Data access (يمكن نقلها إلى productService دون تغيير باقي المكوّن)          */
/* -------------------------------------------------------------------------- */

type CatalogParams = Record<string, string | number | undefined>;

function clean(params: CatalogParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  );
}

async function fetchProducts(params: CatalogParams) {
  const res = await axios.get("/api/products", { params: clean(params) });
  const body = res.data;
  const data = body?.data;
  const items: unknown[] = Array.isArray(data) ? data : (data?.items ?? []);
  const meta: Meta = body?.meta ?? {
    page: 1,
    totalPages: 1,
    total: items.length,
  };
  return { items, meta };
}

async function fetchFacets(q?: string): Promise<Facets> {
  const res = await axios.get("/api/products/facets", {
    params: clean({ q }),
  });
  const d = res.data?.data ?? {};
  return {
    categories: d.categories ?? [],
    minPrice: Number(d.priceRange?.min ?? d.minPrice ?? 0),
    maxPrice: Number(d.priceRange?.max ?? d.maxPrice ?? 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

export function CatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-9 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ProductsCatalog() {
  const locale = useLocale();
  const t = COPY[locale === "ar" ? "ar" : "en"];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ----- الحالة المشتقة من الـ URL (المصدر الوحيد للحقيقة) ----- */
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const inStock = searchParams.get("inStock") === "true";
  const sortParam = searchParams.get("sort") as Sort | null;
  const sort: Sort = sortParam && SORTS.includes(sortParam) ? sortParam : "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const updateUrl = useCallback(
    (patch: Record<string, string | undefined>, keepPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === "" || v === "false") next.delete(k);
        else next.set(k, v);
      });
      if (!keepPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /* ----- البحث النصي (Debounce 300ms) ----- */
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounced(searchInput.trim(), 300);
  useEffect(() => setSearchInput(q), [q]); // مزامنة عند الرجوع/مسح الفلاتر
  useEffect(() => {
    if (debouncedSearch !== q) updateUrl({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /* ----- حقول السعر (تُطبَّق عند الضغط على تطبيق/Enter) ----- */
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);
  useEffect(() => {
    setMinInput(minPrice);
    setMaxInput(maxPrice);
  }, [minPrice, maxPrice]);

  const applyPrice = () => {
    let lo = minInput ? Number(minInput) : undefined;
    let hi = maxInput ? Number(maxInput) : undefined;
    if (lo !== undefined && hi !== undefined && lo > hi) [lo, hi] = [hi, lo];
    updateUrl({
      minPrice: lo !== undefined && lo >= 0 ? String(lo) : undefined,
      maxPrice: hi !== undefined && hi >= 0 ? String(hi) : undefined,
    });
  };

  /* ----- الاستعلامات ----- */
  const productParams: CatalogParams = {
    status: "ACTIVE",
    q: q || undefined,
    category: category || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    inStock: inStock ? "true" : undefined,
    sort,
    page,
    limit: PAGE_SIZE,
  };

  const products = useQuery({
    queryKey: ["products", "catalog", productParams],
    queryFn: () => fetchProducts(productParams),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const facets = useQuery({
    queryKey: ["products", "facets", q],
    queryFn: () => fetchFacets(q || undefined),
    staleTime: 5 * 60_000,
  });

  const items = products.data?.items ?? [];
  const meta = products.data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  /* ----- تصحيح رقم صفحة خارج النطاق ----- */
  useEffect(() => {
    if (meta && page > meta.totalPages && meta.totalPages >= 1) {
      updateUrl({ page: String(meta.totalPages) }, true);
    }
  }, [meta, page, updateUrl]);

  const catLabel = useCallback(
    (c: FacetCategory) =>
      (locale === "ar" ? c.nameAr : c.nameEn) ?? c.nameEn ?? c.nameAr ?? c.slug,
    [locale]
  );

  const activeCategory = facets.data?.categories.find((c) => c.slug === category);

  /* ----- الفلاتر النشطة (Chips) ----- */
  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = [];
    if (q)
      list.push({
        key: "q",
        label: t.searchChip(q),
        clear: () => updateUrl({ q: undefined }),
      });
    if (category)
      list.push({
        key: "category",
        label: activeCategory ? catLabel(activeCategory) : category,
        clear: () => updateUrl({ category: undefined }),
      });
    if (minPrice || maxPrice)
      list.push({
        key: "price",
        label: t.priceChip(
          minPrice ? usd.format(Number(minPrice)) : "0",
          maxPrice ? usd.format(Number(maxPrice)) : "∞"
        ),
        clear: () => updateUrl({ minPrice: undefined, maxPrice: undefined }),
      });
    if (inStock)
      list.push({
        key: "inStock",
        label: t.inStock,
        clear: () => updateUrl({ inStock: undefined }),
      });
    return list;
  }, [q, category, minPrice, maxPrice, inStock, activeCategory, catLabel, t, updateUrl]);

  const clearAll = () =>
    router.replace(pathname, { scroll: false });

  const goToPage = (p: number) => {
    updateUrl({ page: p === 1 ? undefined : String(p) }, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ----- درج الفلاتر على الجوال ----- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  /* ----- لوحة الفلاتر (تُستخدم في الشريط الجانبي والدرج) ----- */
  const inputCls =
    "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-800/30 dark:border-stone-700 dark:bg-stone-900";

  const filtersPanel = (
    <div className="space-y-8">
      <section aria-labelledby="f-cat">
        <h2 id="f-cat" className="mb-3 text-sm font-semibold">
          {t.categories}
        </h2>
        {facets.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => updateUrl({ category: undefined })}
                aria-pressed={!category}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  !category ? "bg-stone-100 font-semibold dark:bg-stone-800" : ""
                }`}
              >
                {t.allCategories}
              </button>
            </li>
            {facets.data?.categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => updateUrl({ category: c.slug })}
                  aria-pressed={category === c.slug}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-stone-100 dark:hover:bg-stone-800 ${
                    category === c.slug ? "bg-stone-100 font-semibold dark:bg-stone-800" : ""
                  }`}
                >
                  <span>{catLabel(c)}</span>
                  {typeof c.count === "number" && (
                    <span className="text-xs text-stone-500 tabular-nums">{c.count}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="f-price">
        <h2 id="f-price" className="mb-3 text-sm font-semibold">
          {t.price}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder={
                facets.data && facets.data.maxPrice > 0
                  ? `${t.min} ${Math.floor(facets.data.minPrice)}`
                  : t.min
              }
              aria-label={t.min}
              className={inputCls}
            />
            <span aria-hidden className="text-stone-400">–</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder={
                facets.data && facets.data.maxPrice > 0
                  ? `${t.max} ${Math.ceil(facets.data.maxPrice)}`
                  : t.max
              }
              aria-label={t.max}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md border border-emerald-900 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-400 dark:hover:text-stone-900"
          >
            {t.apply}
          </button>
        </form>
      </section>

      <section>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateUrl({ inStock: e.target.checked ? "true" : undefined })}
            className="size-4 accent-emerald-800"
          />
          {t.inStock}
        </label>
      </section>

      {chips.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-emerald-900 underline underline-offset-4 dark:text-emerald-300"
        >
          {t.clear}
        </button>
      )}
    </div>
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {/* العنوان + عدد النتائج */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400" aria-live="polite">
          {products.data ? t.results(total) : "\u00A0"}
        </p>
      </header>

      {/* شريط الأدوات */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-stone-500"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className={`${inputCls} ps-9`}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm lg:hidden dark:border-stone-700"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t.filters}
            {chips.length > 0 && (
              <span className="rounded-full bg-emerald-900 px-1.5 text-xs text-white">
                {chips.length}
              </span>
            )}
          </button>

          <label className="flex flex-1 items-center gap-2 text-sm sm:flex-none">
            <span className="sr-only sm:not-sr-only text-stone-600 dark:text-stone-400">
              {t.sort}
            </span>
            <select
              value={sort}
              onChange={(e) => updateUrl({ sort: e.target.value === "newest" ? undefined : e.target.value })}
              className={`${inputCls} sm:w-auto`}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t.sorts[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* الفلاتر النشطة */}
      {chips.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label={t.filters}>
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.clear}
                aria-label={`${t.remove}: ${c.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 py-1 ps-3 pe-2 text-xs transition hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900"
              >
                {c.label}
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* الشريط الجانبي (سطح المكتب) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filtersPanel}</div>
        </aside>

        {/* الشبكة */}
        <main aria-busy={products.isFetching}>
          {products.isError && !products.data ? (
            <div role="alert" className="rounded-lg border border-stone-300 p-10 text-center dark:border-stone-700">
              <h2 className="text-lg font-semibold">{t.errorTitle}</h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t.errorBody}</p>
              <button
                type="button"
                onClick={() => products.refetch()}
                className="mt-4 rounded-md bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {t.retry}
              </button>
            </div>
          ) : products.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
              <h2 className="text-lg font-semibold">{t.emptyTitle}</h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t.emptyBody}</p>
              {chips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-4 rounded-md bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  {t.clear}
                </button>
              )}
            </div>
          ) : (
            <>
              <ul
                className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 ${
                  products.isFetching && products.isPlaceholderData ? "opacity-60 transition-opacity" : ""
                }`}
              >
                {items.map((p, i) => {
                  const product = p as { id?: string; slug?: string };
                  return (
                    <li key={product.id ?? product.slug ?? i}>
                      {/* ProductCard يتولى السعر والمخزون وزر المفضلة (WishlistButton) */}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <ProductCard product={p as any} />
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 && (
                <nav className="mt-12 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40 dark:hover:bg-stone-800"
                  >
                    {t.prev}
                  </button>
                  {pageWindow(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="px-2 text-stone-400" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-label={t.page(p)}
                        aria-current={p === page ? "page" : undefined}
                        className={`min-w-9 rounded-md px-3 py-2 text-sm tabular-nums ${
                          p === page
                            ? "bg-emerald-900 font-semibold text-white"
                            : "hover:bg-stone-100 dark:hover:bg-stone-800"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40 dark:hover:bg-stone-800"
                  >
                    {t.next}
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      {/* درج الفلاتر (جوال) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t.filters}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="absolute inset-y-0 end-0 flex w-[min(22rem,90vw)] flex-col bg-white shadow-xl outline-none dark:bg-stone-950"
          >
            <div className="flex items-center justify-between border-b border-stone-200 p-4 dark:border-stone-800">
              <h2 className="font-semibold">{t.filters}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t.close}>
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div className="border-t border-stone-200 p-4 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {t.showResults}
                {products.data ? ` (${total})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}