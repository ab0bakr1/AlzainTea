"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminProducts,
  useCategoryOptions,
  useDeleteProduct,
} from "@/hooks/useAdminProducts";
import {
  extractApiError,
  type AdminProductListItem,
  type AdminProductSort,
  type AdminProductsQuery,
  type ProductStatus,
} from "@/services/products.service";

// ---------------------------------------------------------------------------
// ثوابت العرض (النصوص من adminPanel.products)
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<ProductStatus, string> = {
  DRAFT: "adm-badge-neutral",
  ACTIVE: "ds-badge-success",
  ARCHIVED: "ds-badge-warning",
  OUT_OF_STOCK: "ds-badge-danger",
};

const TAB_KEYS: ("ALL" | ProductStatus)[] = ["ALL", "ACTIVE", "DRAFT", "OUT_OF_STOCK", "ARCHIVED"];

const SORT_VALUES: AdminProductSort[] = [
  "newest",
  "oldest",
  "name_asc",
  "price_asc",
  "price_desc",
  "stock_asc",
  "stock_desc",
];

const SORT_LABEL_KEY: Record<AdminProductSort, string> = {
  newest: "newest",
  oldest: "oldest",
  name_asc: "nameAsc",
  price_asc: "priceAsc",
  price_desc: "priceDesc",
  stock_asc: "stockAsc",
  stock_desc: "stockDesc",
};

const STATUSES = Object.keys(STATUS_BADGE) as ProductStatus[];
/** يرجع للاسم العربي إن لم يتوفر الإنجليزي في بيانات القائمة */
const categoryName = (lang: "ar" | "en", c: { nameAr: string; nameEn?: string | null }) =>
  lang === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr);

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ---------------------------------------------------------------------------
// قراءة حالة الفلاتر من الرابط (مع تجاهل أي قيمة غير صالحة)
// ---------------------------------------------------------------------------

function parseQuery(sp: { get(name: string): string | null }): AdminProductsQuery {
  const status = sp.get("status");
  const stock = sp.get("stock");
  const sort = sp.get("sort");
  const page = Number(sp.get("page"));

  return {
    q: sp.get("q") || undefined,
    category: sp.get("category") || undefined,
    status: STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : undefined,
    stock: stock === "low" || stock === "out" ? stock : undefined,
    sort: SORT_VALUES.includes(sort as AdminProductSort) ? (sort as AdminProductSort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 20,
  };
}

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------

export function ProductsTable() {
  const t = useTranslations("adminPanel.products");
  const tc = useTranslations("adminPanel.common");
  const lang = useLocale() === "ar" ? "ar" : "en";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, isLoading, isError, isFetching, refetch } = useAdminProducts(query);
  const { data: categories } = useCategoryOptions();
  const deleteMutation = useDeleteProduct();

  const [search, setSearch] = useState(query.q ?? "");
  const [toDelete, setToDelete] = useState<AdminProductListItem | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const productName = (p: { nameAr: string; nameEn: string }) => (lang === "ar" ? p.nameAr : p.nameEn);

  const setParams = useCallback(
    (patch: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // --- بحث مؤجَّل (300ms) متزامن مع الرابط دون الكتابة فوق ما يطبعه المستخدم ---
  const pushedQ = useRef(query.q ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== pushedQ.current) {
        pushedQ.current = trimmed;
        setParams({ q: trimmed || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setParams]);

  useEffect(() => {
    // تغيّر الرابط من الخارج (زر الرجوع مثلاً)
    if ((query.q ?? "") !== pushedQ.current) {
      pushedQ.current = query.q ?? "";
      setSearch(pushedQ.current);
    }
  }, [query.q]);

  // --- إن حُذف آخر عنصر في صفحة متقدمة نرجع صفحة للخلف ---
  const itemsCount = data?.data.length ?? 0;
  useEffect(() => {
    if (data && itemsCount === 0 && (query.page ?? 1) > 1) {
      setParams({ page: String((query.page ?? 1) - 1) }, false);
    }
  }, [data, itemsCount, query.page, setParams]);

  const hasFilters = !!(query.q || query.category || query.status || query.stock);
  const meta = data?.meta;
  const lowThreshold = meta?.lowStockThreshold ?? 5;

  function resetFilters() {
    pushedQ.current = "";
    setSearch("");
    router.replace(pathname, { scroll: false });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const product = toDelete;
    try {
      const result = await deleteMutation.mutateAsync(product.id);
      setNotice({
        type: "success",
        text: result.archived
          ? t("notice.archived", { name: productName(product) })
          : t("notice.deleted", { name: productName(product) }),
      });
    } catch (err) {
      setNotice({ type: "error", text: extractApiError(err, t("notice.deleteFailed")) });
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="grid gap-5">
      {notice && (
        <div
          role="status"
          className={`adm-alert flex items-start justify-between gap-3 ${
            notice.type === "success" ? "adm-alert-success" : "adm-alert-error"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={tc("dismiss")}
            className="text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* تبويبات الحالة مع العدادات */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("tabsAria")}>
        {TAB_KEYS.map((key) => {
          const active = (query.status ?? "ALL") === key;
          const count = meta?.counts[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ status: key === "ALL" ? undefined : key })}
              className="adm-tab"
            >
              {key === "ALL" ? tc("all") : t(`status.${key}`)}
              {count !== undefined && <span className="adm-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* البحث والفلاتر */}
      <div className="adm-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAria")}
          className="adm-control sm:col-span-2 lg:col-span-1"
        />
        <select
          value={query.category ?? ""}
          onChange={(e) => setParams({ category: e.target.value || undefined })}
          aria-label={t("categoryAria")}
          className="adm-control"
        >
          <option value="">{t("allCategories")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {productName(c)}
            </option>
          ))}
        </select>
        <select
          value={query.stock ?? ""}
          onChange={(e) => setParams({ stock: e.target.value || undefined })}
          aria-label={t("stockAria")}
          className="adm-control"
        >
          <option value="">{t("allStock")}</option>
          <option value="low">{t("lowStock")}</option>
          <option value="out">{t("outStock")}</option>
        </select>
        <select
          value={query.sort}
          onChange={(e) => setParams({ sort: e.target.value === "newest" ? undefined : e.target.value })}
          aria-label={t("sortAria")}
          className="adm-control"
        >
          {SORT_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`sort.${SORT_LABEL_KEY[v]}`)}
            </option>
          ))}
        </select>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="adm-alert adm-alert-error p-8 text-center">
          <p>{t("loadError")}</p>
          <button type="button" onClick={() => refetch()} className="ds-btn adm-btn-sm adm-btn-danger mt-3">
            {tc("retry")}
          </button>
        </div>
      ) : itemsCount === 0 ? (
        <div className="adm-empty">
          {hasFilters ? (
            <>
              <p>{t("emptyFiltered")}</p>
              <button type="button" onClick={resetFilters} className="adm-link mt-3">
                {tc("clearFilters")}
              </button>
            </>
          ) : (
            <>
              <p>{t("empty")}</p>
              <Link href="/admin/products/new" className="adm-link mt-3 inline-block">
                {t("addFirst")}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`adm-table-wrap ${isFetching ? "opacity-60" : ""}`}>
          <table className="adm-table min-w-full">
            <thead>
              <tr>
                <th>{t("cols.product")}</th>
                <th>{t("cols.category")}</th>
                <th>{t("cols.price")}</th>
                <th>{t("cols.available")}</th>
                <th>{t("cols.status")}</th>
                <th>{t("cols.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  lang={lang}
                  lowThreshold={lowThreshold}
                  onDelete={() => setToDelete(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* الترقيم */}
      {meta && meta.total > 0 && (
        <div className="adm-subtle flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>{t("pageInfo", { total: meta.total, page: meta.page, pages: meta.totalPages })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setParams({ page: String(meta.page - 1) }, false)}
              className="ds-btn ds-btn-outline adm-btn-sm"
            >
              {tc("previous")}
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setParams({ page: String(meta.page + 1) }, false)}
              className="ds-btn ds-btn-outline adm-btn-sm"
            >
              {tc("next")}
            </button>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={t("dialog.title")}
          confirmLabel={t("dialog.confirm")}
          busy={deleteMutation.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          <p>
            {t.rich("dialog.body", {
              name: productName(toDelete),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p className="adm-subtle mt-2">{t("dialog.archiveNote")}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// صف المنتج
// ---------------------------------------------------------------------------

function ProductRow({
  product: p,
  lang,
  lowThreshold,
  onDelete,
}: {
  product: AdminProductListItem;
  lang: "ar" | "en";
  lowThreshold: number;
  onDelete: () => void;
}) {
  const t = useTranslations("adminPanel.products");
  const tc = useTranslations("adminPanel.common");
  const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT;
  const statusKey = p.status in STATUS_BADGE ? p.status : "DRAFT";
  const out = p.availableStock <= 0;
  const low = !out && p.availableStock <= lowThreshold;

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0]} alt="" loading="lazy" className="adm-thumb" />
          ) : (
            <div className="adm-thumb adm-thumb-empty" />
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold">{lang === "ar" ? p.nameAr : p.nameEn}</div>
            <div className="adm-subtle truncate text-xs">{lang === "ar" ? p.nameEn : p.nameAr}</div>
            <div dir="ltr" className="adm-subtle text-start text-xs opacity-80">
              {p.sku}
              {p.variantsCount > 0 && <span className="ms-2">· {t("variantsCount", { n: p.variantsCount })}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="adm-subtle">{p.category ? categoryName(lang, p.category) : null}</td>
      <td>
        <div className="font-semibold tabular-nums">{usd.format(p.price)}</div>
        {p.compareAtPrice != null && (
          <div className="ds-price-compare text-xs">{usd.format(p.compareAtPrice)}</div>
        )}
      </td>
      <td>
        <span
          className={`tabular-nums ${
            out
              ? "font-semibold text-[var(--color-danger)]"
              : low
                ? "font-semibold text-[var(--color-warning)]"
                : "adm-subtle"
          }`}
        >
          {p.availableStock}
        </span>
        {out && <span className="ms-2 text-xs text-[var(--color-danger)]">{t("out")}</span>}
        {low && <span className="ms-2 text-xs text-[var(--color-warning)]">{t("low")}</span>}
        {p.reservedStock > 0 && (
          <div className="adm-subtle text-xs">{t("reserved", { n: p.reservedStock })}</div>
        )}
      </td>
      <td>
        <span className={`ds-badge whitespace-nowrap ${badge}`}>{t(`status.${statusKey}`)}</span>
      </td>
      <td>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/admin/products/${p.id}/edit`} className="adm-link">
            {tc("edit")}
          </Link>
          {p.status === "ACTIVE" && (
            <Link href={`/products/${p.slug}`} target="_blank" rel="noopener" className="adm-subtle hover:underline">
              {tc("view")}
            </Link>
          )}
          <button type="button" onClick={onDelete} className="text-[var(--color-danger)] hover:underline">
            {tc("delete")}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// عناصر مساعدة
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="adm-card divide-y divide-[var(--border-color)]" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <div className="adm-skeleton size-11" />
          <div className="grid flex-1 gap-2">
            <div className="adm-skeleton h-3 w-1/3" />
            <div className="adm-skeleton h-3 w-1/4" />
          </div>
          <div className="adm-skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  title,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const tc = useTranslations("adminPanel.common");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="adm-overlay" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="adm-dialog"
      >
        <h2 className="ds-font-heading mb-3 text-xl font-bold">{title}</h2>
        <div className="text-sm leading-7">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="ds-btn ds-btn-outline adm-btn-sm">
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="ds-btn adm-btn-sm adm-btn-danger-solid"
          >
            {busy ? tc("executing") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}