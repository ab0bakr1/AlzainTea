"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
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

const field =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const ghostBtn =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700";

const SORT_LABELS: Record<ReviewSort, string> = {
  newest: "الأحدث أولاً",
  oldest: "الأقدم أولاً",
  rating_desc: "الأعلى تقييماً",
  rating_asc: "الأقل تقييماً",
};

type Notice = { type: "success" | "error"; text: string };

export default function ReviewsTable() {
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
    const t = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(t);
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
    { value: "", label: "الكل", count: stats?.total },
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
      setNotice({
        type: "success",
        text: status === "APPROVED" ? "تم نشر المراجعة." : "تم رفض المراجعة.",
      });
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
        text: `${action === "APPROVE" ? "تم نشر" : "تم رفض"} ${r.affected} من ${r.requested} مراجعة.`,
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
      setNotice({ type: "success", text: ids.length === 1 ? "تم حذف المراجعة." : `تم حذف ${ids.length} مراجعات.` });
      setSelection([]);
    } catch (e) {
      setNotice({ type: "error", text: getErrorMessage(e) });
    } finally {
      setConfirm(null);
    }
  }

  const colCount = 7;

  return (
    <section className="space-y-4">
      {/* تبويبات الحالة */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="حالة المراجعة">
        {tabs.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={active}
              onClick={() => setFilters({ status: tab.value })}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ms-2 tabular-nums ${active ? "text-white/80" : "text-zinc-500"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* البحث والفلاتر */}
      <div className="flex flex-wrap items-end gap-3" role="search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="بحث في المراجعات"
          placeholder="ابحث في التعليق أو المنتج أو اسم/بريد المراجع"
          className={`${field} w-full max-w-sm`}
        />
        <select
          aria-label="التقييم"
          value={filters.rating}
          onChange={(e) => setFilters({ rating: e.target.value as typeof filters.rating })}
          className={field}
        >
          <option value="">كل التقييمات</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "نجمة" : "نجوم"}
            </option>
          ))}
        </select>
        <select
          aria-label="الشراء الموثّق"
          value={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.value as typeof filters.verified })}
          className={field}
        >
          <option value="">موثّق وغير موثّق</option>
          <option value="true">شراء موثّق فقط</option>
          <option value="false">غير موثّق فقط</option>
        </select>
        <select
          aria-label="الترتيب"
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value as ReviewSort })}
          className={field}
        >
          {(Object.keys(SORT_LABELS) as ReviewSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
        {activeCount > 0 && (
          <button
            onClick={() => {
              setSearch("");
              reset();
            }}
            className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
          >
            مسح الفلاتر ({activeCount})
          </button>
        )}
        {isFetching && !isLoading && <span className="text-xs text-zinc-500">جارٍ التحديث…</span>}
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={`rounded-lg p-3 text-sm ${
            notice.type === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* شريط الإجراءات الجماعية */}
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label="إجراءات جماعية"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-700/40 bg-emerald-50 p-3 dark:bg-emerald-500/10"
        >
          <span className="me-2 text-sm font-medium">تم تحديد {selectedIds.length}</span>
          <button
            disabled={busy}
            onClick={() => handleBulk("APPROVE")}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            نشر المحدد
          </button>
          <button disabled={busy} onClick={() => handleBulk("REJECT")} className={ghostBtn}>
            رفض المحدد
          </button>
          <button
            disabled={busy}
            onClick={() => setConfirm({ ids: selectedIds })}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40 dark:border-red-500/40 dark:text-red-400"
          >
            حذف المحدد
          </button>
          <button onClick={() => setSelection([])} className="ms-auto text-sm underline underline-offset-2">
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="تحديد كل المراجعات في هذه الصفحة"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={items.length === 0 || busy}
                />
              </th>
              {["المنتج", "المراجع", "التقييم والتعليق", "الحالة", "التاريخ", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading &&
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={i} aria-hidden="true">
                  <td colSpan={colCount} className="px-4 py-4">
                    <div className="h-8 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
                  </td>
                </tr>
              ))}

            {isError && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center">
                  <p className="text-red-600">تعذّر تحميل المراجعات.</p>
                  <button onClick={() => refetch()} className="mt-2 text-sm underline underline-offset-2">
                    إعادة المحاولة
                  </button>
                </td>
              </tr>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-zinc-500">
                  {filters.page > 1 ? (
                    <>
                      لا توجد نتائج في هذه الصفحة.{" "}
                      <button
                        onClick={() => setFilters({ page: 1 })}
                        className="underline underline-offset-2"
                      >
                        العودة إلى الصفحة الأولى
                      </button>
                    </>
                  ) : activeCount > 0 ? (
                    "لا توجد مراجعات تطابق هذه الفلاتر. خفّف الفلاتر أو امسحها."
                  ) : filters.status === "PENDING" ? (
                    "لا توجد مراجعات بانتظار القرار. ستظهر هنا فور إرسال العملاء تقييماتهم."
                  ) : (
                    "لا توجد مراجعات في هذا التبويب."
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
                <tr
                  key={r.id}
                  className={`align-top hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                    activeIds.has(r.id) ? "bg-emerald-50/60 dark:bg-emerald-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`تحديد مراجعة ${r.user.name}`}
                      checked={activeIds.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      disabled={busy}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${r.product.slug}`}
                      target="_blank"
                      className="flex items-center gap-3"
                    >
                      {r.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.product.image}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
                        />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                      )}
                      <span className="max-w-[180px] font-medium underline-offset-2 hover:underline">
                        {productName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.user.name}</div>
                    <div className="text-xs text-zinc-500">{r.user.email}</div>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={r.rating} size={14} />
                      {r.verifiedPurchase && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
                          شراء موثّق
                        </span>
                      )}
                    </div>
                    {r.comment ? (
                      <>
                        <p className="mt-1.5 whitespace-pre-line break-words text-zinc-700 dark:text-zinc-300">
                          {long && !isOpen ? `${r.comment.slice(0, COMMENT_PREVIEW_CHARS)}…` : r.comment}
                        </p>
                        {long && (
                          <button
                            onClick={() => toggleExpanded(r.id)}
                            className="mt-1 text-xs underline underline-offset-2"
                          >
                            {isOpen ? "عرض أقل" : "عرض المزيد"}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="mt-1.5 text-xs text-zinc-500">تقييم بدون تعليق</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ReviewStatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(r.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status !== "APPROVED" && (
                        <button
                          disabled={busy}
                          onClick={() => handleModerate(r.id, "APPROVED")}
                          className="rounded-lg bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-50"
                        >
                          {rowBusy ? "…" : "نشر"}
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button
                          disabled={busy}
                          onClick={() => handleModerate(r.id, "REJECTED")}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
                        >
                          رفض
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => setConfirm({ ids: [r.id] })}
                        className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400"
                      >
                        حذف
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            الصفحة {data.meta.page} من {data.meta.totalPages} — {data.meta.total} مراجعة
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters({ page: filters.page - 1 })}
              className={ghostBtn}
            >
              السابق
            </button>
            <button
              disabled={filters.page >= data.meta.totalPages}
              onClick={() => setFilters({ page: filters.page + 1 })}
              className={ghostBtn}
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* حوار تأكيد الحذف */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="review-delete-title"
            aria-describedby="review-delete-desc"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
          >
            <h2 id="review-delete-title" className="text-base font-semibold">
              {confirm.ids.length > 1 ? `حذف ${confirm.ids.length} مراجعات؟` : "حذف المراجعة؟"}
            </h2>
            <p id="review-delete-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              الحذف نهائي ولا يمكن التراجع عنه. إذا كنت تريد إخفاءها عن العملاء فقط، استخدم «رفض» بدلاً من ذلك.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus disabled={busy} onClick={() => setConfirm(null)} className={ghostBtn}>
                إلغاء
              </button>
              <button
                disabled={busy}
                onClick={handleConfirmedDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "جارٍ الحذف…" : "حذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}