"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminCategories, useDeleteCategory } from "@/hooks/useAdminCategories";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  AdminCategoriesQuery,
  AdminCategoryListItem,
  AdminCategorySort,
  CategoryScope,
} from "@/services/categories.service";

// ---------------------------------------------------------------------------
// ثوابت العرض
// ---------------------------------------------------------------------------

type TabKey = "ALL" | "ROOT" | "CHILD";

const TABS: { key: TabKey; label: string; scope?: CategoryScope }[] = [
  { key: "ALL", label: "الكل" },
  { key: "ROOT", label: "رئيسية", scope: "root" },
  { key: "CHILD", label: "فرعية", scope: "child" },
];

const SORT_OPTIONS: { value: AdminCategorySort; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
  { value: "name_asc", label: "الاسم (أ → ي)" },
  { value: "products_desc", label: "الأكثر منتجات" },
  { value: "products_asc", label: "الأقل منتجات" },
];

const PAGE_SIZE = 20;

const dateFormat = new Intl.DateTimeFormat("ar-u-nu-latn", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const controlClass =
  "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

// ---------------------------------------------------------------------------
// قراءة حالة الفلاتر من الرابط (مع تجاهل أي قيمة غير صالحة)
// ---------------------------------------------------------------------------

function parseQuery(sp: { get(name: string): string | null }): AdminCategoriesQuery {
  const scope = sp.get("scope");
  const sort = sp.get("sort");
  const page = Number(sp.get("page"));

  return {
    q: sp.get("q") || undefined,
    scope: scope === "root" || scope === "child" ? scope : undefined,
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as AdminCategorySort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------

export function CategoriesTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, isLoading, isError, isFetching, refetch } = useAdminCategories(query);
  const deleteMutation = useDeleteCategory();

  const [search, setSearch] = useState(query.q ?? "");
  const [toDelete, setToDelete] = useState<AdminCategoryListItem | null>(null);
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

  const hasFilters = !!(query.q || query.scope);
  const meta = data?.meta;

  function resetFilters() {
    pushedQ.current = "";
    setSearch("");
    router.replace(pathname, { scroll: false });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const category = toDelete;
    try {
      await deleteMutation.mutateAsync(category.id);
      setNotice({ type: "success", text: `تم حذف «${category.nameAr}» نهائياً` });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err, "تعذّر حذف الفئة") });
    } finally {
      setToDelete(null);
    }
  }

  const deleteBlocked =
    !!toDelete && (toDelete._count.products > 0 || toDelete._count.children > 0);

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

      {/* تبويبات النوع مع العدادات */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب نوع الفئة">
        {TABS.map((tab) => {
          const active = (query.scope ?? undefined) === tab.scope;
          const count = meta?.counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ scope: tab.scope })}
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

      {/* البحث والترتيب */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم العربي أو الإنجليزي أو الرابط"
          aria-label="بحث في الفئات"
          className={controlClass}
        />
        <select
          value={query.sort}
          onChange={(e) => setParams({ sort: e.target.value === "newest" ? undefined : e.target.value })}
          aria-label="ترتيب الفئات"
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
          <p className="text-red-700">تعذّر تحميل الفئات.</p>
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
              <p>لا توجد فئات مطابقة للفلاتر الحالية.</p>
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
              <p>لا توجد فئات بعد.</p>
              <Link
                href="/admin/categories/new"
                className="mt-3 inline-block text-emerald-700 hover:underline"
              >
                أضف أول فئة
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
                <th className="px-4 py-3 text-start font-medium">الفئة</th>
                <th className="px-4 py-3 text-start font-medium">الفئة الأب</th>
                <th className="px-4 py-3 text-start font-medium">المنتجات</th>
                <th className="px-4 py-3 text-start font-medium">الفرعية</th>
                <th className="px-4 py-3 text-start font-medium">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-start font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {data?.data.map((c) => (
                <CategoryRow key={c.id} category={c} onDelete={() => setToDelete(c)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* الترقيم */}
      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
          <span>
            {meta.total} فئة — صفحة {meta.page} من {meta.totalPages}
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
          title="حذف الفئة"
          confirmLabel="حذف الفئة"
          busy={deleteMutation.isPending}
          confirmDisabled={deleteBlocked}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          {deleteBlocked ? (
            <>
              <p>
                لا يمكن حذف «<strong>{toDelete.nameAr}</strong>» حالياً:
              </p>
              <ul className="mt-2 list-disc ps-5 text-red-700">
                {toDelete._count.products > 0 && (
                  <li>
                    تحتوي على {toDelete._count.products} منتج — انقل المنتجات إلى فئة أخرى أولاً.
                  </li>
                )}
                {toDelete._count.children > 0 && (
                  <li>
                    تحتها {toDelete._count.children} فئة فرعية — انقلها أو احذفها أولاً.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p>
              سيتم حذف «<strong>{toDelete.nameAr}</strong>» نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// صف الفئة
// ---------------------------------------------------------------------------

function CategoryRow({
  category: c,
  onDelete,
}: {
  category: AdminCategoryListItem;
  onDelete: () => void;
}) {
  return (
    <tr className="align-middle">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt=""
              loading="lazy"
              className="size-11 shrink-0 rounded-md border border-stone-200 object-cover"
            />
          ) : (
            <div className="size-11 shrink-0 rounded-md border border-dashed border-stone-300 bg-stone-50" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-stone-800">{c.nameAr}</div>
            <div className="truncate text-xs text-stone-500">{c.nameEn}</div>
            <div dir="ltr" className="truncate text-start text-xs text-stone-400">
              {c.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-stone-600">{c.parent?.nameAr ?? "—"}</td>
      <td className="px-4 py-3 text-stone-600">
        {c._count.products > 0 ? (
          <Link
            href={`/admin/products?category=${encodeURIComponent(c.slug)}`}
            className="text-emerald-700 hover:underline"
          >
            {c._count.products}
          </Link>
        ) : (
          <span className="text-stone-400">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-stone-600">
        {c._count.children > 0 ? c._count.children : <span className="text-stone-400">0</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-stone-500">
        {dateFormat.format(new Date(c.createdAt))}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/admin/categories/${c.id}`} className="text-emerald-700 hover:underline">
            تعديل
          </Link>
          <Link
            href={`/category/${c.slug}`}
            target="_blank"
            rel="noopener"
            className="text-stone-600 hover:underline"
          >
            عرض
          </Link>
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
  confirmDisabled = false,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  confirmDisabled?: boolean;
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
            autoFocus={confirmDisabled}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {confirmDisabled ? "إغلاق" : "إلغاء"}
          </button>
          {!confirmDisabled && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              autoFocus
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "جارٍ التنفيذ..." : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}