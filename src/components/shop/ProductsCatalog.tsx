"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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

/* مفاتيح الترجمة (ar.json / en.json → products.sortOptions.*) */
const SORT_LABEL_KEY = {
  newest: "sortOptions.newest",
  bestselling: "sortOptions.bestselling",
  price_asc: "sortOptions.priceAsc",
  price_desc: "sortOptions.priceDesc",
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
/* Visual tokens (كلاسات التصميم فقط — تعتمد على variables.css و globals.css)  */
/* -------------------------------------------------------------------------- */

const inputCls = "ds-input rounded-[var(--radius-lg)]";

const skeletonBlock = "animate-pulse bg-[var(--color-form)]";

const pageBtnBase =
  "grid size-10 place-items-center rounded-full border border-[var(--border-color)] text-sm tabular-nums text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-200)] disabled:pointer-events-none disabled:opacity-40";

const pageBtnActive =
  "grid size-10 place-items-center rounded-full border border-transparent bg-[image:var(--gradient-gold)] text-sm font-semibold tabular-nums text-[var(--color-on-primary)] shadow-[var(--shadow-gold)]";

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

export function CatalogSkeleton() {
  return (
    <div>
      <div
        className="h-40 sm:h-48"
        style={{ backgroundImage: "var(--gradient-ink)" }}
      />
      <div className="ds-container py-8 lg:py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div
                className={`${skeletonBlock} aspect-square rounded-[var(--radius-lg)]`}
              />
              <div
                className={`${skeletonBlock} h-4 w-3/4 rounded-[var(--radius-sm)]`}
              />
              <div
                className={`${skeletonBlock} h-4 w-1/3 rounded-[var(--radius-sm)]`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ProductsCatalog() {
  const locale = useLocale();
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
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

  useEffect(() => {
    if (debouncedSearch !== q) updateUrl({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /* ----- حقول السعر (تُطبَّق عند الضغط على تطبيق/Enter) ----- */
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }

  const [prevRange, setPrevRange] = useState({ minPrice, maxPrice });
  if (minPrice !== prevRange.minPrice || maxPrice !== prevRange.maxPrice) {
    setPrevRange({ minPrice, maxPrice });
    setMinInput(minPrice);
    setMaxInput(maxPrice);
  }

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
        label: t("catalog.searchChip", { query: q }),
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
        label: t("catalog.priceChip", {
          from: minPrice ? usd.format(Number(minPrice)) : "0",
          to: maxPrice ? usd.format(Number(maxPrice)) : "∞",
        }),
        clear: () => updateUrl({ minPrice: undefined, maxPrice: undefined }),
      });
    if (inStock)
      list.push({
        key: "inStock",
        label: t("inStockOnly"),
        clear: () => updateUrl({ inStock: undefined }),
      });
    return list;
  }, [q, category, minPrice, maxPrice, inStock, activeCategory, catLabel, t, updateUrl]);

  const clearAll = () => router.replace(pathname, { scroll: false });

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

  /* ----- شكل زر الفئة (تصميم فقط) ----- */
  const catBtnCls = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border-s-2 px-3 py-2 text-sm transition ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary-200)] font-semibold text-[var(--color-accent-text)]"
        : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-200)] hover:text-[var(--color-text-primary)]"
    }`;

  /* ----- لوحة الفلاتر (تُستخدم في الشريط الجانبي والدرج) ----- */
  const filtersPanel = (
    <div className="space-y-6">
      <section aria-labelledby="f-cat">
        <h2
          id="f-cat"
          className="ds-font-heading mb-3 text-lg font-semibold text-[var(--color-text-primary)]"
        >
          {t("categories")}
        </h2>
        {facets.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`${skeletonBlock} h-9 rounded-[var(--radius-md)]`}
              />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => updateUrl({ category: undefined })}
                aria-pressed={!category}
                className={catBtnCls(!category)}
              >
                {t("allCategories")}
              </button>
            </li>
            {facets.data?.categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => updateUrl({ category: c.slug })}
                  aria-pressed={category === c.slug}
                  className={catBtnCls(category === c.slug)}
                >
                  <span>{catLabel(c)}</span>
                  {typeof c.count === "number" && (
                    <span className="text-xs tabular-nums text-[var(--color-text-disabled)]">
                      {c.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="ds-gold-rule" />

      <section aria-labelledby="f-price">
        <h2
          id="f-price"
          className="ds-font-heading mb-3 text-lg font-semibold text-[var(--color-text-primary)]"
        >
          {t("priceRange")}
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
                  ? `${t("catalog.from")} ${Math.floor(facets.data.minPrice)}`
                  : t("catalog.from")
              }
              aria-label={t("catalog.from")}
              className={inputCls}
            />
            <span aria-hidden className="text-[var(--color-text-disabled)]">
              –
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder={
                facets.data && facets.data.maxPrice > 0
                  ? `${t("catalog.to")} ${Math.ceil(facets.data.maxPrice)}`
                  : t("catalog.to")
              }
              aria-label={t("catalog.to")}
              className={inputCls}
            />
          </div>
          <button type="submit" className="ds-btn ds-btn-primary w-full">
            {tc("apply")}
          </button>
        </form>
      </section>

      <hr className="ds-gold-rule" />

      <section>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateUrl({ inStock: e.target.checked ? "true" : undefined })}
            className="size-4 accent-[var(--color-primary)]"
          />
          {t("inStockOnly")}
        </label>
      </section>

      {chips.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="ds-btn ds-btn-ghost w-full"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div>
      {/* ===== Header: عنوان كبير + breadcrumb خفيف (نفس لغة هيرو الرئيسية) ===== */}
      <header
        className="relative isolate overflow-hidden"
        style={{ backgroundImage: "var(--gradient-ink)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, rgba(201,164,92,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="ds-container py-10 sm:py-14">
          <nav aria-label={t("catalog.breadcrumbLabel")}>
            <ol className="flex items-center gap-1.5 text-sm text-[var(--color-on-inverse)]/70">
              <li>
                <Link
                  href="/"
                  className="transition hover:text-[var(--brand-gold-light)]"
                >
                  {tn("home")}
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
              </li>
              <li
                aria-current="page"
                className="text-[var(--brand-gold-light)]"
              >
                {t("title")}
              </li>
            </ol>
          </nav>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="ds-text-gold text-4xl leading-[1.35] sm:text-5xl">
                {t("title")}
              </h1>
              <p className="mt-3 text-[var(--color-on-inverse)]/80">
                {t("catalog.subtitle")}
              </p>
            </div>
            <p
              className="ds-badge !px-4 !py-1 !text-sm"
              aria-live="polite"
            >
              {products.data ? t("catalog.results", { count: total }) : "\u00A0"}
            </p>
          </div>
        </div>
        <hr className="ds-gold-rule" />
      </header>

      {/* ===== شريط الفلاتر: خلفية كريمية + border سفلي ===== */}
      <div className="border-b border-[var(--border-color)] bg-[var(--color-bg-alt)]">
        <div className="ds-container py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute inset-y-0 start-4 my-auto size-4 text-[var(--color-text-disabled)]"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("catalog.searchCatalogPlaceholder")}
                aria-label={t("catalog.searchCatalogPlaceholder")}
                className={`${inputCls} ps-11`}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="ds-btn ds-btn-outline lg:hidden"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                {t("filtersTitle")}
                {chips.length > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-[var(--color-primary)] px-1.5 text-xs font-semibold text-[var(--color-on-primary)]">
                    {chips.length}
                  </span>
                )}
              </button>

              <label className="flex flex-1 items-center gap-2 text-sm sm:flex-none">
                <span className="sr-only text-[var(--color-text-secondary)] sm:not-sr-only">
                  {t("sortBy")}
                </span>
                <select
                  value={sort}
                  onChange={(e) =>
                    updateUrl({
                      sort: e.target.value === "newest" ? undefined : e.target.value,
                    })
                  }
                  className={`${inputCls} cursor-pointer sm:w-auto`}
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(SORT_LABEL_KEY[s])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* الفلاتر النشطة (chips) */}
          {chips.length > 0 && (
            <ul
              className="mt-4 flex flex-wrap gap-2"
              aria-label={t("catalog.activeFilters")}
            >
              {chips.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={c.clear}
                    aria-label={`${t("catalog.removeFilter")}: ${c.label}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--color-primary-200)] py-1.5 ps-3.5 pe-2.5 text-xs font-medium text-[var(--color-accent-text)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]"
                  >
                    {c.label}
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ===== المحتوى ===== */}
      <div className="ds-container py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-10">
          {/* الشريط الجانبي (سطح المكتب) */}
          <aside className="hidden lg:block">
            <div className="ds-card sticky top-24 p-5">{filtersPanel}</div>
          </aside>

          {/* الشبكة */}
          <main aria-busy={products.isFetching}>
            {products.isError && !products.data ? (
              <div role="alert" className="ds-card p-10 text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                  <X className="size-6" aria-hidden />
                </div>
                <h2 className="text-xl">{t("catalog.errorTitle")}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {t("catalog.errorBody")}
                </p>
                <button
                  type="button"
                  onClick={() => products.refetch()}
                  className="ds-btn ds-btn-primary mt-5"
                >
                  {tc("retry")}
                </button>
              </div>
            ) : products.isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div
                      className={`${skeletonBlock} aspect-square rounded-[var(--radius-lg)]`}
                    />
                    <div
                      className={`${skeletonBlock} h-4 w-3/4 rounded-[var(--radius-sm)]`}
                    />
                    <div
                      className={`${skeletonBlock} h-4 w-1/3 rounded-[var(--radius-sm)]`}
                    />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="ds-card border-dashed p-10 text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[var(--color-primary-200)] text-[var(--color-accent-text)]">
                  <Search className="size-6" aria-hidden />
                </div>
                <h2 className="text-xl">{t("catalog.emptyTitle")}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {t("catalog.emptyBody")}
                </p>
                {chips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="ds-btn ds-btn-primary mt-5"
                  >
                    {t("clearFilters")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <ul
                  className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 ${
                    products.isFetching && products.isPlaceholderData
                      ? "opacity-60 transition-opacity"
                      : ""
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
                  <nav
                    className="mt-14 flex flex-wrap items-center justify-center gap-2"
                    aria-label={t("catalog.paginationLabel")}
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      className={pageBtnBase}
                    >
                      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
                      <span className="sr-only">{tc("previous")}</span>
                    </button>
                    {pageWindow(page, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span
                          key={`e${i}`}
                          className="px-1 text-[var(--color-text-disabled)]"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          aria-label={t("catalog.pageLabel", { page: p })}
                          aria-current={p === page ? "page" : undefined}
                          className={p === page ? pageBtnActive : pageBtnBase}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      className={pageBtnBase}
                    >
                      <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
                      <span className="sr-only">{tc("next")}</span>
                    </button>
                  </nav>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ===== درج الفلاتر (جوال): خلفية بيضاء/داكنة + ظل جانبي ===== */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("filtersTitle")}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="absolute inset-y-0 end-0 flex w-[min(22rem,90vw)] flex-col border-s border-[var(--border-color)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)] outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-4">
              <h2 className="ds-font-heading text-xl">{t("filtersTitle")}</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={tc("close")}
                className="grid size-10 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-200)] hover:text-[var(--color-text-primary)]"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filtersPanel}</div>
            <div className="border-t border-[var(--border-color)] p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="ds-btn ds-btn-primary w-full"
              >
                {t("catalog.showResults")}
                {products.data ? ` (${total})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}