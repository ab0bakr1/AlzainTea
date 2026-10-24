"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAdminCategories, useDeleteCategory } from "@/hooks/useAdminCategories";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  AdminCategoriesQuery,
  AdminCategoryListItem,
  AdminCategorySort,
  CategoryScope,
} from "@/services/categories.service";

// ---------------------------------------------------------------------------
// ثوابت العرض (النصوص من adminPanel.categories)
// ---------------------------------------------------------------------------

type TabKey = "ALL" | "ROOT" | "CHILD";

const TABS: { key: TabKey; scope?: CategoryScope }[] = [
  { key: "ALL" },
  { key: "ROOT", scope: "root" },
  { key: "CHILD", scope: "child" },
];

const SORT_VALUES: AdminCategorySort[] = ["newest", "oldest", "name_asc", "products_desc", "products_asc"];

const SORT_LABEL_KEY: Record<AdminCategorySort, string> = {
  newest: "newest",
  oldest: "oldest",
  name_asc: "nameAsc",
  products_desc: "productsDesc",
  products_asc: "productsAsc",
};

const PAGE_SIZE = 20;

/** يرجع للاسم العربي إن لم يتوفر الإنجليزي في بيانات الفئة الأب */
const parentName = (lang: "ar" | "en", c: { nameAr: string; nameEn?: string | null }) =>
  lang === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr);

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
    sort: SORT_VALUES.includes(sort as AdminCategorySort) ? (sort as AdminCategorySort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------

export function CategoriesTable() {
  const t = useTranslations("adminPanel.categories");
  const tc = useTranslations("adminPanel.common");
  const lang = useLocale() === "ar" ? "ar" : "en";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { data, isLoading, isError, isFetching, refetch } = useAdminCategories(query);
  const deleteMutation = useDeleteCategory();

  const [search, setSearch] = useState(query.q ?? "");
  const [toDelete, setToDelete] = useState<AdminCategoryListItem | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const catName = (c: { nameAr: string; nameEn: string }) => (lang === "ar" ? c.nameAr : c.nameEn);

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
      setNotice({ type: "success", text: t("notice.deleted", { name: catName(category) }) });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err, t("notice.deleteFailed")) });
    } finally {
      setToDelete(null);
    }
  }

  const deleteBlocked = !!toDelete && (toDelete._count.products > 0 || toDelete._count.children > 0);

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

      {/* تبويبات النوع مع العدادات */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("tabsAria")}>
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
              className="adm-tab"
            >
              {t(`tabs.${tab.key}`)}
              {count !== undefined && <span className="adm-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* البحث والترتيب */}
      <div className="adm-card grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAria")}
          className="adm-control"
        />
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
              <Link href="/admin/categories/new" className="adm-link mt-3 inline-block">
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
                <th>{t("cols.category")}</th>
                <th>{t("cols.parent")}</th>
                <th>{t("cols.products")}</th>
                <th>{t("cols.children")}</th>
                <th>{t("cols.created")}</th>
                <th>{t("cols.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c) => (
                <CategoryRow key={c.id} category={c} lang={lang} onDelete={() => setToDelete(c)} />
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
          confirmDisabled={deleteBlocked}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          {deleteBlocked ? (
            <>
              <p>
                {t.rich("dialog.blockedIntro", {
                  name: catName(toDelete),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <ul className="mt-2 list-disc ps-5 text-[var(--color-danger)]">
                {toDelete._count.products > 0 && (
                  <li>{t("dialog.blockedProducts", { n: toDelete._count.products })}</li>
                )}
                {toDelete._count.children > 0 && (
                  <li>{t("dialog.blockedChildren", { n: toDelete._count.children })}</li>
                )}
              </ul>
            </>
          ) : (
            <p>
              {t.rich("dialog.body", {
                name: catName(toDelete),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
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
  lang,
  onDelete,
}: {
  category: AdminCategoryListItem;
  lang: "ar" | "en";
  onDelete: () => void;
}) {
  const t = useTranslations("adminPanel.categories");
  const tc = useTranslations("adminPanel.common");
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [lang],
  );

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image} alt="" loading="lazy" className="adm-thumb" />
          ) : (
            <div className="adm-thumb adm-thumb-empty" />
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold">{lang === "ar" ? c.nameAr : c.nameEn}</div>
            <div className="adm-subtle truncate text-xs">{lang === "ar" ? c.nameEn : c.nameAr}</div>
            <div dir="ltr" className="adm-subtle truncate text-start text-xs opacity-80">
              {c.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="adm-subtle">{c.parent ? parentName(lang, c.parent) : "—"}</td>
      <td className="tabular-nums">
        {c._count.products > 0 ? (
          <Link href={`/admin/products?category=${encodeURIComponent(c.slug)}`} className="adm-link">
            {c._count.products}
          </Link>
        ) : (
          <span className="adm-subtle">0</span>
        )}
      </td>
      <td className="adm-subtle tabular-nums">{c._count.children > 0 ? c._count.children : 0}</td>
      <td className="adm-subtle whitespace-nowrap">{dateFormat.format(new Date(c.createdAt))}</td>
      <td>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/admin/categories/${c.id}`} className="adm-link">
            {tc("edit")}
          </Link>
          <Link href={`/category/${c.slug}`} target="_blank" rel="noopener" className="adm-subtle hover:underline">
            {tc("view")}
          </Link>
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
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            autoFocus={confirmDisabled}
            className="ds-btn ds-btn-outline adm-btn-sm"
          >
            {confirmDisabled ? tc("close") : tc("cancel")}
          </button>
          {!confirmDisabled && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              autoFocus
              className="ds-btn adm-btn-sm adm-btn-danger-solid"
            >
              {busy ? tc("executing") : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}