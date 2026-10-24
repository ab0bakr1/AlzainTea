"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

const field = "adm-control";

export default function OrdersTable() {
  const t = useTranslations("adminPanel.orders");
  const tc = useTranslations("adminPanel.common");
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { filters, setFilters, reset, activeCount } = useAdminOrderFilters();

  const [search, setSearch] = useState(filters.q);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // Debounce للبحث النصي ثم كتابته في الرابط
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const timer = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(timer);
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
        setExportMsg(t("exportNone"));
        return;
      }
      const day = new Date().toISOString().slice(0, 10);
      downloadCsv(`orders-${day}.csv`, buildOrdersCsv(items, lang));
      setExportMsg(truncated ? t("exportTruncated", { max: EXPORT_MAX_ROWS }) : t("exportDone", { n: items.length }));
    } catch (e) {
      setExportMsg(getApiErrorMessage(e, t("exportFailed")));
    } finally {
      setExporting(false);
    }
  }

  const headers = [t("cols.order"), t("cols.customer"), t("cols.country"), t("cols.total"), t("cols.payment"), t("cols.status"), t("cols.date"), ""];
  const colCount = headers.length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="adm-heading">{t("title")}</h1>
        <button
          onClick={handleExport}
          disabled={exporting || isLoading || !data?.meta.total}
          className="ds-btn ds-btn-outline adm-btn-sm"
        >
          {exporting ? t("exporting") : t("export")}
        </button>
      </div>

      <div className="adm-card flex flex-wrap items-end gap-3 p-4" role="search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t("searchAria")}
          placeholder={t("searchPlaceholder")}
          className={`${field} w-full max-w-sm`}
        />
        <select
          aria-label={t("orderStatusAria")}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as OrderStatusValue | "" })}
          className={field}
        >
          <option value="">{t("allOrderStatuses")}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        <select
          aria-label={t("paymentStatusAria")}
          value={filters.paymentStatus}
          onChange={(e) => setFilters({ paymentStatus: e.target.value as PaymentStatusValue | "" })}
          className={field}
        >
          <option value="">{t("allPaymentStatuses")}</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        <select
          aria-label={t("countryAria")}
          value={filters.country}
          onChange={(e) => setFilters({ country: e.target.value })}
          className={field}
        >
          <option value="">{t("allCountries")}</option>
          {countryNames.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <label className="adm-subtle flex items-center gap-2 text-sm">
          {t("from")}
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilters({ from: e.target.value })}
            className={field}
          />
        </label>
        <label className="adm-subtle flex items-center gap-2 text-sm">
          {t("to")}
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
            className="adm-link text-sm"
          >
            {tc("clearFiltersCount", { n: activeCount })}
          </button>
        )}
        {isFetching && !isLoading && <span className="adm-subtle text-xs">{tc("updating")}</span>}
      </div>

      {exportMsg && (
        <p role="status" className="adm-subtle text-sm">
          {exportMsg}
        </p>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table min-w-[900px]">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={colCount} className="adm-subtle !py-10 text-center">
                  {t("loading")}
                </td>
              </tr>
            )}
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
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={colCount} className="adm-subtle !py-10 text-center">
                  {activeCount > 0 ? t("emptyFiltered") : t("empty")}
                </td>
              </tr>
            )}
            {data?.items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="adm-link font-mono text-xs">
                    {o.id.slice(-8)}
                  </Link>
                  <div className="adm-subtle text-xs">{t("itemsCount", { n: o._count.items })}</div>
                </td>
                <td>
                  <div>{o.user?.name ?? t("guest")}</div>
                  <div className="adm-subtle text-xs">{o.user?.email ?? o.guestEmail}</div>
                </td>
                <td>{o.country}</td>
                <td className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(o.total, o.currency, locale)}</td>
                <td>
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <div className="adm-subtle mt-1 text-xs">{o.paymentMethod}</div>
                </td>
                <td>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="adm-subtle whitespace-nowrap">{formatDateTime(o.createdAt, locale)}</td>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="ds-btn ds-btn-ghost adm-btn-sm">
                    {tc("open")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="adm-subtle">
            {t("pageInfo", { page: data.meta.page, pages: data.meta.totalPages, total: data.meta.total })}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters({ page: filters.page - 1 })}
              className="ds-btn ds-btn-outline adm-btn-sm"
            >
              {tc("previous")}
            </button>
            <button
              disabled={filters.page >= data.meta.totalPages}
              onClick={() => setFilters({ page: filters.page + 1 })}
              className="ds-btn ds-btn-outline adm-btn-sm"
            >
              {tc("next")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}