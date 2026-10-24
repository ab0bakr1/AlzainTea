"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import StarRating from "@/components/shop/StarRating";
import { ReviewStatusBadge, REVIEW_STATUS_LABELS } from "@/components/ui/ReviewStatusBadge";
import { useAdminReviewFilters } from "@/hooks/useAdminReviewFilters";
import {
  useAdminReviewStats,
  useAdminReviews,
  useBulkReviews,
  useDeleteReview,
  useModerateReview,
} from "@/hooks/useReviews";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateTime } from "@/lib/order-format";
import type { ReviewSort, ReviewStatus } from "@/services/reviews";

const PAGE_SIZE = 20;
const COMMENT_PREVIEW_CHARS = 140;
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

const field = "adm-control";
const ghostBtn = "ds-btn ds-btn-outline adm-btn-sm";
const SORT_KEYS: Record<ReviewSort, string> = {
  newest: "newest",
  oldest: "oldest",
  rating_desc: "ratingDesc",
  rating_asc: "ratingAsc",
};

type Notice = { type: "success" | "error"; text: string };

export default function ReviewsTable() {
  const t = useTranslations("adminPanel.reviews");
  const tc = useTranslations("adminPanel.common");
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { filters, setFilters, reset, activeCount } = useAdminReviewFilters();

  const [search, setSearch] = useState(filters.q);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);

  // التحديد مرتبط بمفتاح الفلاتر: يُفرَّغ تلقائياً عند تغيير التبويب/الصفحة/البحث بدون useEffect
  const filtersKey = JSON.stringify(filters);
  const [sel, setSel] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: filtersKey,
    ids: EMPTY_SET,
  });
  const activeIds = sel.key === filtersKey ? sel.ids : EMPTY_SET;

  // Debounce للبحث النصي ثم كتابته في الرابط
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const timer = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(timer);
  }, [search, filters.q, setFilters]);

  // Escape يغلق حوار الحذف
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  const { data, isLoading, isError, isFetching, refetch } = useAdminReviews({
    status: filters.status || undefined,
    rating: filters.rating ? Number(filters.rating) : undefined,
    verified: filters.verified === "" ? undefined : filters.verified === "true",
    q: filters.q || undefined,
    sort: filters.sort,
    page: filters.page,
    limit: PAGE_SIZE,
  });
  const { data: stats } = useAdminReviewStats();

  const moderate = useModerateReview();
  const remove = useDeleteReview();
  const bulk = useBulkReviews();
  const busy = moderate.isPending || remove.isPending || bulk.isPending;

  const items = data?.items ?? [];
  const selectedIds = items.filter((r) => activeIds.has(r.id)).map((r) => r.id);
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const tabs: { value: ReviewStatus | ""; label: string; count?: number }[] = [
    { value: "PENDING", label: REVIEW_STATUS_LABELS.PENDING[lang], count: stats?.pending },
    { value: "APPROVED", label: REVIEW_STATUS_LABELS.APPROVED[lang], count: stats?.approved },
    { value: "REJECTED", label: REVIEW_STATUS_LABELS.REJECTED[lang], count: stats?.rejected },
    { value: "", label: tc("all"), count: stats?.total },
  ];

  function setSelection(ids: Iterable<string>) {
    setSel({ key: filtersKey, ids: new Set(ids) });
  }
  function toggleOne(id: string) {
    const next = new Set(activeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  }
  function toggleAll() {
    setSelection(allSelected ? [] : items.map((r) => r.id));
  }
  function toggleExpanded(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  async function handleModerate(id: string, status: "APPROVED" | "REJECTED") {
    setNotice(null);
    try {
      await moderate.mutateAsync({ id, status });
      setNotice({ type: "success", text: status === "APPROVED" ? t("notice.published") : t("notice.rejected") });
    } catch (e) {
      setNotice({ type: "error", text: getErrorMessage(e) });
    }
  }

  async function handleBulk(action: "APPROVE" | "REJECT") {
    setNotice(null);
    try {
      const r = await bulk.mutateAsync({ ids: selectedIds, action });
      setNotice({
        type: "success",
        text: t(action === "APPROVE" ? "notice.bulkApproved" : "notice.bulkRejected", {
          affected: r.affected,
          requested: r.requested,
        }),
      });
      setSelection([]);
    } catch (e) {
      setNotice({ type: "error", text: getErrorMessage(e) });
    }
  }

  async function handleConfirmedDelete() {
    if (!confirm) return;
    const { ids } = confirm;
    setNotice(null);
    try {
      if (ids.length === 1) await remove.mutateAsync(ids[0]);
      else await bulk.mutateAsync({ ids, action: "DELETE" });
      setNotice({
        type: "success",
        text: ids.length === 1 ? t("notice.deletedOne") : t("notice.deletedMany", { n: ids.length }),
      });
      setSelection([]);
    } catch (e) {
      setNotice({ type: "error", text: getErrorMessage(e) });
    } finally {
      setConfirm(null);
    }
  }

  const headers = [t("cols.product"), t("cols.reviewer"), t("cols.ratingComment"), t("cols.status"), t("cols.date"), ""];
  const colCount = headers.length + 1;

  return (
    <section className="space-y-5">
      {/* تبويبات الحالة */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("tabsAria")}>
        {tabs.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={active}
              onClick={() => setFilters({ status: tab.value })}
              className="adm-tab"
            >
              {tab.label}
              {tab.count !== undefined && <span className="adm-tab-count">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* البحث والفلاتر */}
      <div className="adm-card flex flex-wrap items-end gap-3 p-4" role="search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t("searchAria")}
          placeholder={t("searchPlaceholder")}
          className={`${field} w-full max-w-sm`}
        />
        <select
          aria-label={t("ratingAria")}
          value={filters.rating}
          onChange={(e) => setFilters({ rating: e.target.value as typeof filters.rating })}
          className={field}
        >
          <option value="">{t("allRatings")}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {t("stars", { n })}
            </option>
          ))}
        </select>
        <select
          aria-label={t("verifiedAria")}
          value={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.value as typeof filters.verified })}
          className={field}
        >
          <option value="">{t("allVerified")}</option>
          <option value="true">{t("verifiedOnly")}</option>
          <option value="false">{t("unverifiedOnly")}</option>
        </select>
        <select
          aria-label={t("sortAria")}
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value as ReviewSort })}
          className={field}
        >
          {(Object.keys(SORT_KEYS) as ReviewSort[]).map((s) => (
            <option key={s} value={s}>
              {t(`sort.${SORT_KEYS[s]}`)}
            </option>
          ))}
        </select>
        {activeCount > 0 && (
          <button
            onClick={() => {
              setSearch("");
              reset();
            }}
            className="adm-link text-sm"
          >
            {tc("clearFiltersCount", { n: activeCount })}
          </button>
        )}
        {isFetching && !isLoading && <span className="adm-subtle text-xs">{tc("updating")}</span>}
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={`adm-alert ${notice.type === "error" ? "adm-alert-error" : "adm-alert-success"}`}
        >
          {notice.text}
        </p>
      )}

      {/* شريط الإجراءات الجماعية */}
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label={t("bulk.region")}
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius-2xl)] border border-[var(--border-color-gold)] bg-[var(--color-primary-200)] p-3"
        >
          <span className="me-2 text-sm font-semibold">{t("bulk.selected", { n: selectedIds.length })}</span>
          <button disabled={busy} onClick={() => handleBulk("APPROVE")} className="ds-btn ds-btn-primary adm-btn-sm">
            {t("bulk.approve")}
          </button>
          <button disabled={busy} onClick={() => handleBulk("REJECT")} className={ghostBtn}>
            {t("bulk.reject")}
          </button>
          <button
            disabled={busy}
            onClick={() => setConfirm({ ids: selectedIds })}
            className="ds-btn adm-btn-sm adm-btn-danger"
          >
            {t("bulk.delete")}
          </button>
          <button onClick={() => setSelection([])} className="adm-link ms-auto text-sm">
            {t("bulk.clear")}
          </button>
        </div>
      )}

      {/* الجدول */}
      <div className="adm-table-wrap">
        <table className="adm-table is-top min-w-[960px]">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  className="adm-check"
                  aria-label={t("selectAll")}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={items.length === 0 || busy}
                />
              </th>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={i} aria-hidden="true">
                  <td colSpan={colCount}>
                    <div className="adm-skeleton h-8" />
                  </td>
                </tr>
              ))}

            {isError && (
              <tr>
                <td colSpan={colCount} className="!py-10 text-center">
                  <p className="text-[var(--color-danger)]">{t("loadError")}</p>
                  <button onClick={() => refetch()} className="adm-link mt-2 text-sm">
                    {tc("retry")}
                  </button>
                </td>
              </tr>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={colCount} className="adm-subtle !py-10 text-center">
                  {filters.page > 1 ? (
                    <>
                      {t("empty.page")}{" "}
                      <button onClick={() => setFilters({ page: 1 })} className="adm-link">
                        {t("empty.backFirst")}
                      </button>
                    </>
                  ) : activeCount > 0 ? (
                    t("empty.filtered")
                  ) : filters.status === "PENDING" ? (
                    t("empty.pending")
                  ) : (
                    t("empty.tab")
                  )}
                </td>
              </tr>
            )}

            {items.map((r) => {
              const productName = lang === "ar" ? r.product.nameAr : r.product.nameEn;
              const long = (r.comment?.length ?? 0) > COMMENT_PREVIEW_CHARS;
              const isOpen = expanded.has(r.id);
              const rowBusy = moderate.isPending && moderate.variables?.id === r.id;
              return (
                <tr key={r.id} className={activeIds.has(r.id) ? "adm-row-selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="adm-check"
                      aria-label={t("selectReview", { name: r.user.name })}
                      checked={activeIds.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      disabled={busy}
                    />
                  </td>
                  <td>
                    <Link href={`/products/${r.product.slug}`} target="_blank" className="flex items-center gap-3">
                      {r.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.product.image} alt="" loading="lazy" className="adm-thumb !h-10 !w-10" />
                      ) : (
                        <span className="adm-thumb adm-thumb-empty !h-10 !w-10" />
                      )}
                      <span className="max-w-[180px] font-medium hover:underline">{productName}</span>
                    </Link>
                  </td>
                  <td>
                    <div>{r.user.name}</div>
                    <div className="adm-subtle text-xs">{r.user.email}</div>
                  </td>
                  <td className="max-w-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={r.rating} size={14} />
                      {r.verifiedPurchase && <span className="ds-badge ds-badge-success">{t("verifiedBadge")}</span>}
                    </div>
                    {r.comment ? (
                      <>
                        <p className="mt-2 whitespace-pre-line break-words leading-7">
                          {long && !isOpen ? `${r.comment.slice(0, COMMENT_PREVIEW_CHARS)}…` : r.comment}
                        </p>
                        {long && (
                          <button onClick={() => toggleExpanded(r.id)} className="adm-link mt-1 text-xs">
                            {isOpen ? t("showLess") : t("showMore")}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="adm-subtle mt-2 text-xs">{t("noComment")}</p>
                    )}
                  </td>
                  <td>
                    <ReviewStatusBadge status={r.status} />
                  </td>
                  <td className="adm-subtle whitespace-nowrap">{formatDateTime(r.createdAt, locale)}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status !== "APPROVED" && (
                        <button
                          disabled={busy}
                          onClick={() => handleModerate(r.id, "APPROVED")}
                          className="ds-btn ds-btn-primary adm-btn-sm"
                        >
                          {rowBusy ? "…" : t("approve")}
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button disabled={busy} onClick={() => handleModerate(r.id, "REJECTED")} className={ghostBtn}>
                          {t("reject")}
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => setConfirm({ ids: [r.id] })}
                        className="ds-btn adm-btn-sm adm-btn-danger"
                      >
                        {tc("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* الترقيم */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="adm-subtle">
            {t("pageInfo", { page: data.meta.page, pages: data.meta.totalPages, total: data.meta.total })}
          </span>
          <div className="flex gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters({ page: filters.page - 1 })} className={ghostBtn}>
              {tc("previous")}
            </button>
            <button
              disabled={filters.page >= data.meta.totalPages}
              onClick={() => setFilters({ page: filters.page + 1 })}
              className={ghostBtn}
            >
              {tc("next")}
            </button>
          </div>
        </div>
      )}

      {/* حوار تأكيد الحذف */}
      {confirm && (
        <div className="adm-overlay" onClick={() => !busy && setConfirm(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="review-delete-title"
            aria-describedby="review-delete-desc"
            onClick={(e) => e.stopPropagation()}
            className="adm-dialog max-w-sm"
          >
            <h2 id="review-delete-title" className="ds-font-heading text-xl font-bold">
              {confirm.ids.length > 1 ? t("dialog.titleMany", { n: confirm.ids.length }) : t("dialog.titleOne")}
            </h2>
            <p id="review-delete-desc" className="adm-subtle mt-3 text-sm leading-7">
              {t("dialog.desc")}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button autoFocus disabled={busy} onClick={() => setConfirm(null)} className={ghostBtn}>
                {tc("cancel")}
              </button>
              <button
                disabled={busy}
                onClick={handleConfirmedDelete}
                className="ds-btn adm-btn-sm adm-btn-danger-solid"
              >
                {busy ? t("dialog.deleting") : t("dialog.deleteForever")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}