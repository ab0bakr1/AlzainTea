"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useAdminOrders } from "@/hooks/useOrders";
import { useAdminOrderFilters } from "@/hooks/useAdminOrderFilters";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "@/modules/orders/order-status";
import { EXPORT_MAX_ROWS, fetchAllAdminOrders, getApiErrorMessage } from "@/services/orders.service";
import { buildOrdersCsv, downloadCsv } from "@/lib/orders-csv";
import { formatDateTime, formatMoney } from "@/lib/order-format";

const PAGE_SIZE = 20;
const COUNTRY_CODES = ["SA", "AE", "OM", "KW", "BH", "QA", "US", "GB"] as const;

const field =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export default function OrdersTable() {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { filters, setFilters, reset, activeCount } = useAdminOrderFilters();

  const [search, setSearch] = useState(filters.q);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // Debounce للبحث النصي ثم كتابته في الرابط
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const t = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(t);
  }, [search, filters.q, setFilters]);

  const countryNames = useMemo(() => {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((c) => [c, dn.of(c) ?? c] as const);
  }, [locale]);

  const apiFilters = {
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    country: filters.country,
    q: filters.q,
    from: filters.from,
    to: filters.to,
  };

  const { data, isLoading, isError, isFetching, refetch } = useAdminOrders({
    ...apiFilters,
    page: filters.page,
    limit: PAGE_SIZE,
  });

  async function handleExport() {
    setExporting(true);
    setExportMsg(null);
    try {
      const { items, truncated } = await fetchAllAdminOrders(apiFilters);
      if (items.length === 0) {
        setExportMsg("لا توجد طلبات مطابقة للتصدير.");
        return;
      }
      const day = new Date().toISOString().slice(0, 10);
      downloadCsv(`orders-${day}.csv`, buildOrdersCsv(items, lang));
      setExportMsg(
        truncated
          ? `تم تصدير أول ${EXPORT_MAX_ROWS} طلب فقط. ضيّق الفلاتر لتصدير الباقي.`
          : `تم تصدير ${items.length} طلب.`
      );
    } catch (e) {
      setExportMsg(getApiErrorMessage(e, "تعذّر التصدير، حاول مجدداً."));
    } finally {
      setExporting(false);
    }
  }

  const colCount = 8;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">الطلبات</h1>
        <button
          onClick={handleExport}
          disabled={exporting || isLoading || !data?.meta.total}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3" role="search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="بحث في الطلبات"
          placeholder="رقم الطلب أو مرجع الدفع أو البريد أو الاسم"
          className={`${field} w-full max-w-sm`}
        />
        <select
          aria-label="حالة الطلب"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as OrderStatusValue | "" })}
          className={field}
        >
          <option value="">كل حالات الطلب</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        <select
          aria-label="حالة الدفع"
          value={filters.paymentStatus}
          onChange={(e) => setFilters({ paymentStatus: e.target.value as PaymentStatusValue | "" })}
          className={field}
        >
          <option value="">كل حالات الدفع</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        <select
          aria-label="الدولة"
          value={filters.country}
          onChange={(e) => setFilters({ country: e.target.value })}
          className={field}
        >
          <option value="">كل الدول</option>
          {countryNames.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          من
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilters({ from: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          إلى
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilters({ to: e.target.value })}
            className={field}
          />
        </label>
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

      {exportMsg && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {exportMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              {["الطلب", "العميل", "الدولة", "الإجمالي", "الدفع", "الحالة", "التاريخ", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-zinc-500">
                  جارٍ تحميل الطلبات…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center">
                  <p className="text-red-600">تعذّر تحميل الطلبات.</p>
                  <button onClick={() => refetch()} className="mt-2 text-sm underline underline-offset-2">
                    إعادة المحاولة
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-zinc-500">
                  {activeCount > 0
                    ? "لا توجد طلبات تطابق هذه الفلاتر. خفّف الفلاتر أو امسحها."
                    : "لا توجد طلبات بعد. ستظهر هنا فور إتمام أول عملية شراء."}
                </td>
              </tr>
            )}
            {data?.items.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs underline underline-offset-2">
                    {o.id.slice(-8)}
                  </Link>
                  <div className="text-xs text-zinc-500">{o._count.items} منتج</div>
                </td>
                <td className="px-4 py-3">
                  <div>{o.user?.name ?? "زائر"}</div>
                  <div className="text-xs text-zinc-500">{o.user?.email ?? o.guestEmail}</div>
                </td>
                <td className="px-4 py-3">{o.country}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatMoney(o.total, o.currency, locale)}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <div className="mt-1 text-xs text-zinc-500">{o.paymentMethod}</div>
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDateTime(o.createdAt, locale)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="text-sm underline underline-offset-2">
                    فتح
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            الصفحة {data.meta.page} من {data.meta.totalPages} — {data.meta.total} طلب
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters({ page: filters.page - 1 })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
            >
              السابق
            </button>
            <button
              disabled={filters.page >= data.meta.totalPages}
              onClick={() => setFilters({ page: filters.page + 1 })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </section>
  );
}