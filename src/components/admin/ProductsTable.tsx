"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// ثوابت العرض
// ---------------------------------------------------------------------------

const STATUS_META: Record<ProductStatus, { text: string; className: string }> = {
  DRAFT: { text: "مسودة", className: "bg-stone-100 text-stone-600" },
  ACTIVE: { text: "نشط", className: "bg-emerald-100 text-emerald-700" },
  ARCHIVED: { text: "مؤرشف", className: "bg-amber-100 text-amber-700" },
  OUT_OF_STOCK: { text: "نفدت الكمية", className: "bg-red-100 text-red-700" },
};

const TABS: { key: "ALL" | ProductStatus; label: string }[] = [
  { key: "ALL", label: "الكل" },
  { key: "ACTIVE", label: "نشط" },
  { key: "DRAFT", label: "مسودة" },
  { key: "OUT_OF_STOCK", label: "نفدت الكمية" },
  { key: "ARCHIVED", label: "مؤرشف" },
];

const SORT_OPTIONS: { value: AdminProductSort; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
  { value: "name_asc", label: "الاسم (أ → ي)" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "stock_asc", label: "المخزون: الأقل أولاً" },
  { value: "stock_desc", label: "المخزون: الأعلى أولاً" },
];

const STATUSES = Object.keys(STATUS_META) as ProductStatus[];
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const controlClass =
  "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

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
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as AdminProductSort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 20,
  };
}

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------

export function ProductsTable() {
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
          ? `تمت أرشفة «${product.nameAr}» لأنه مرتبط بطلبات سابقة`
          : `تم حذف «${product.nameAr}» نهائياً`,
      });
    } catch (err) {
      setNotice({ type: "error", text: extractApiError(err, "تعذّر حذف المنتج") });
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="grid gap-4">
      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="إغلاق الرسالة"
            className="text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* تبويبات الحالة مع العدادات */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب الحالة">
        {TABS.map((tab) => {
          const active = (query.status ?? "ALL") === tab.key;
          const count = meta?.counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ status: tab.key === "ALL" ? undefined : tab.key })}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span className={`ms-1.5 text-xs ${active ? "text-emerald-100" : "text-stone-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* البحث والفلاتر */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو SKU أو الرابط"
          aria-label="بحث في المنتجات"
          className={`${controlClass} sm:col-span-2 lg:col-span-1`}
        />
        <select
          value={query.category ?? ""}
          onChange={(e) => setParams({ category: e.target.value || undefined })}
          aria-label="تصفية حسب الفئة"
          className={controlClass}
        >
          <option value="">كل الفئات</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.nameAr}
            </option>
          ))}
        </select>
        <select
          value={query.stock ?? ""}
          onChange={(e) => setParams({ stock: e.target.value || undefined })}
          aria-label="تصفية حسب المخزون"
          className={controlClass}
        >
          <option value="">كل المخزون</option>
          <option value="low">مخزون منخفض</option>
          <option value="out">نفد المخزون</option>
        </select>
        <select
          value={query.sort}
          onChange={(e) => setParams({ sort: e.target.value === "newest" ? undefined : e.target.value })}
          aria-label="ترتيب المنتجات"
          className={controlClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">تعذّر تحميل المنتجات.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : itemsCount === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-stone-500">
          {hasFilters ? (
            <>
              <p>لا توجد منتجات مطابقة للفلاتر الحالية.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-emerald-700 hover:underline"
              >
                مسح الفلاتر
              </button>
            </>
          ) : (
            <>
              <p>لا توجد منتجات بعد.</p>
              <Link
                href="/admin/products/new"
                className="mt-3 inline-block text-emerald-700 hover:underline"
              >
                أضف أول منتج
              </Link>
            </>
          )}
        </div>
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-stone-200 transition-opacity ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">المنتج</th>
                <th className="px-4 py-3 text-start font-medium">الفئة</th>
                <th className="px-4 py-3 text-start font-medium">السعر</th>
                <th className="px-4 py-3 text-start font-medium">المتاح للبيع</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="px-4 py-3 text-start font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {data?.data.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
          <span>
            {meta.total} منتج — صفحة {meta.page} من {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setParams({ page: String(meta.page - 1) }, false)}
              className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setParams({ page: String(meta.page + 1) }, false)}
              className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="حذف المنتج"
          confirmLabel="حذف المنتج"
          busy={deleteMutation.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          <p>
            سيتم حذف «<strong>{toDelete.nameAr}</strong>». لا يمكن التراجع عن الحذف النهائي.
          </p>
          <p className="mt-2 text-stone-500">
            إذا كان المنتج مرتبطاً بطلبات سابقة فسيتم أرشفته بدلاً من حذفه، للحفاظ على سجل الطلبات.
          </p>
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
  lowThreshold,
  onDelete,
}: {
  product: AdminProductListItem;
  lowThreshold: number;
  onDelete: () => void;
}) {
  const status = STATUS_META[p.status] ?? STATUS_META.DRAFT;
  const out = p.availableStock <= 0;
  const low = !out && p.availableStock <= lowThreshold;

  return (
    <tr className="align-middle">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.images[0]}
              alt=""
              loading="lazy"
              className="size-11 shrink-0 rounded-md border border-stone-200 object-cover"
            />
          ) : (
            <div className="size-11 shrink-0 rounded-md border border-dashed border-stone-300 bg-stone-50" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-stone-800">{p.nameAr}</div>
            <div className="truncate text-xs text-stone-500">{p.nameEn}</div>
            <div dir="ltr" className="text-start text-xs text-stone-400">
              {p.sku}
              {p.variantsCount > 0 && <span className="ms-2">· {p.variantsCount} متغيرات</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-stone-600">{p.category?.nameAr}</td>
      <td className="px-4 py-3 text-stone-700">
        <div>{usd.format(p.price)}</div>
        {p.compareAtPrice != null && (
          <div className="text-xs text-stone-400 line-through">{usd.format(p.compareAtPrice)}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={out ? "font-medium text-red-600" : low ? "font-medium text-amber-600" : "text-stone-600"}
        >
          {p.availableStock}
        </span>
        {out && <span className="ms-2 text-xs text-red-600">نفد</span>}
        {low && <span className="ms-2 text-xs text-amber-600">منخفض</span>}
        {p.reservedStock > 0 && (
          <div className="text-xs text-stone-400">محجوز: {p.reservedStock}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-1 text-xs ${status.className}`}>{status.text}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/admin/products/${p.id}`} className="text-emerald-700 hover:underline">
            تعديل
          </Link>
          {p.status === "ACTIVE" && (
            <Link
              href={`/products/${p.slug}`}
              target="_blank"
              rel="noopener"
              className="text-stone-600 hover:underline"
            >
              عرض
            </Link>
          )}
          <button type="button" onClick={onDelete} className="text-red-600 hover:underline">
            حذف
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
    <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <div className="size-11 animate-pulse rounded-md bg-stone-100" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-3 text-lg font-semibold text-stone-800">{title}</h2>
        <div className="text-sm text-stone-700">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}