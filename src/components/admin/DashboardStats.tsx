"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  MessageSquareText,
  Percent,
  RefreshCw,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import DailyOrdersChart from "@/components/admin/DailyOrdersChart";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { ADMIN_REPORT_KEYS, useLowStockReport, useOverviewReport } from "@/hooks/useAdminReports";
import { formatMoney } from "@/lib/order-format";
import type { OrderStatusValue } from "@/modules/orders/order-status";
import type { OverviewReport } from "@/services/reports";

const RANGES = [7, 30, 90] as const;
const THRESHOLDS = [3, 5, 10, 20] as const;
const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "REFUNDED",
  "CANCELLED",
  "FAILED",
];

/** يختار الاسم حسب اللغة، ويرجع للعربي إن لم يوفّر التقرير الاسم الإنجليزي */
const pickName = (isAr: boolean, p: { nameAr: string; nameEn?: string | null }) =>
  isAr ? p.nameAr : (p.nameEn ?? p.nameAr);

const isReportQuery = (q: { queryKey: readonly unknown[] }) =>
  (ADMIN_REPORT_KEYS as readonly string[]).includes(String(q.queryKey[0]));

const muted = "adm-subtle";
const card = "adm-card";
const rowDivider = "divide-y divide-[var(--border-color)]";

/** منسّقات الأرقام والتواريخ والعملات حسب لغة الواجهة */
function useFormatters() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const intl = isAr ? "ar-u-nu-latn" : "en-US";
  return useMemo(
    () => ({
      locale,
      isAr,
      intl,
      num: (n: number) => new Intl.NumberFormat(intl).format(n),
      percent: (ratio: number) => new Intl.NumberFormat(intl, { style: "percent" }).format(ratio),
      date: (iso: string) =>
        new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso)),
      money: (value: number, currency: string) => formatMoney(value, currency, intl),
    }),
    [locale, isAr, intl],
  );
}

/* ------------------------------------------------------------------ */
/* عناصر مساعدة                                                        */
/* ------------------------------------------------------------------ */

const Pulse = ({ className = "" }: { className?: string }) => <div className={`adm-skeleton ${className}`} />;

const Empty = ({ children }: { children: ReactNode }) => (
  <p className={`py-6 text-center text-sm ${muted}`}>{children}</p>
);

function Bar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-form)]">
      <div className="ds-bg-gold h-full rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${card} ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] px-6 py-5">
        <div>
          <h2 className="ds-font-heading text-lg font-bold">{title}</h2>
          {subtitle && <p className={`mt-1 text-xs leading-6 ${muted}`}>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
}) {
  const body = (
    <div className={`${card} flex items-start gap-4 p-5 ${href ? "adm-card-link" : ""}`}>
      <span className="adm-icon-chip">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`text-sm ${muted}`}>{label}</p>
        <p className="ds-font-heading ds-text-alt mt-1 text-3xl font-bold tabular-nums">{value}</p>
        {hint && <p className={`mt-1 text-xs ${muted}`}>{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("adminPanel.dashboard");
  const tc = useTranslations("common");
  return (
    <div role="alert" className="adm-alert adm-alert-error flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="h-6 w-6" aria-hidden />
      <p className="font-medium">{t("loadError")}</p>
      <button type="button" onClick={onRetry} className="ds-btn adm-btn-sm adm-btn-danger-solid">
        {tc("retry")}
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  const t = useTranslations("adminPanel.dashboard");
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("loadingAria")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Pulse key={i} className="h-[104px]" />
        ))}
      </div>
      <Pulse className="h-40" />
      <Pulse className="h-80" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Pulse className="h-72" />
        <Pulse className="h-72" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* المخزون المنخفض — مربوط بـ GET /api/admin/reports/low-stock         */
/* ------------------------------------------------------------------ */

function LowStockPanel() {
  const t = useTranslations("adminPanel.dashboard");
  const tc = useTranslations("common");
  const f = useFormatters();
  const [threshold, setThreshold] = useState<number>(5);
  const { data, isLoading, isError, refetch } = useLowStockReport(threshold);

  return (
    <Panel
      title={t("lowStock.title")}
      subtitle={t("lowStock.subtitle")}
      action={
        <select
          aria-label={t("lowStock.thresholdLabel")}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="adm-control adm-control-sm"
        >
          {THRESHOLDS.map((n) => (
            <option key={n} value={n}>
              {t("lowStock.thresholdOption", { n })}
            </option>
          ))}
        </select>
      }
    >
      {isError ? (
        <div className="py-4 text-center text-sm">
          <p className="text-[var(--color-danger)]">{t("lowStock.error")}</p>
          <button type="button" onClick={() => refetch()} className="adm-link mt-2">
            {tc("retry")}
          </button>
        </div>
      ) : isLoading || !data ? (
        <Pulse className="h-40" />
      ) : data.items.length === 0 ? (
        <Empty>{t("lowStock.empty")}</Empty>
      ) : (
        <>
          <ul className={`-my-3 ${rowDivider}`}>
            {data.items.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/admin/products/${p.id}`} className="min-w-0 hover:underline">
                  <span className="block truncate text-sm font-medium">{pickName(f.isAr, p)}</span>
                  <span dir="ltr" className={`block text-start text-xs ${muted}`}>
                    {p.sku}
                  </span>
                </Link>
                <div className="shrink-0 text-end">
                  <span className={`ds-badge ${p.available <= 0 ? "ds-badge-danger" : "ds-badge-warning"}`}>
                    {p.available <= 0 ? t("lowStock.outOfStock") : t("lowStock.available", { n: f.num(p.available) })}
                  </span>
                  {p.reservedStock > 0 && (
                    <p className={`mt-1 text-xs ${muted}`}>{t("lowStock.reserved", { n: f.num(p.reservedStock) })}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {data.items.length >= 20 && <p className={`mt-4 text-xs ${muted}`}>{t("lowStock.showingFirst")}</p>}
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* المحتوى الرئيسي                                                     */
/* ------------------------------------------------------------------ */

function Content({ data }: { data: OverviewReport }) {
  const t = useTranslations("adminPanel.dashboard");
  const f = useFormatters();

  const countryNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([f.locale], { type: "region" });
    } catch {
      return null;
    }
  }, [f.locale]);
  const countryName = (code: string) => countryNames?.of(code) ?? code;

  const { kpis } = data;
  const confirmed = data.ordersByStatus.find((s) => s.status === "CONFIRMED")?.count ?? 0;
  const payRate = kpis.totalOrders ? kpis.paidOrders / kpis.totalOrders : 0;

  const actions = [
    { label: t("actions.pendingReviews"), count: kpis.pendingReviews, href: "/admin/reviews" },
    { label: t("actions.confirmedOrders"), count: confirmed, href: "/admin/orders" },
    { label: t("actions.lowStock"), count: data.lowStock.length, href: "/admin/products" },
  ].filter((a) => a.count > 0);

  const totalDaily = data.dailyOrders.reduce((s, d) => s + d.orders, 0);
  const peakDay = data.dailyOrders.reduce((a, d) => (d.orders > a.orders ? d : a), { date: "", orders: 0 });

  const maxUnits = Math.max(1, ...data.topProducts.map((p) => p.unitsSold));
  const maxCountry = Math.max(1, ...data.salesByCountry.map((c) => c.orders));
  const statuses = [...data.ordersByStatus].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  return (
    <div className="space-y-6">
      {/* إجراءات تحتاج انتباهك */}
      {actions.length === 0 ? (
        <div className="adm-alert adm-alert-success flex items-center gap-3 px-5 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          {t("actions.none")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="adm-alert adm-alert-warning adm-card-link flex items-center justify-between px-5 py-3"
            >
              <span className="text-sm">
                <span className="me-2 text-lg font-bold tabular-nums">{f.num(a.count)}</span>
                {a.label}
              </span>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      {/* المؤشرات */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("kpi.paidOrders")}
          value={f.num(kpis.paidOrders)}
          hint={t("kpi.paidOf", { n: f.num(kpis.totalOrders) })}
          icon={CircleDollarSign}
        />
        <KpiCard label={t("kpi.payRate")} value={f.percent(payRate)} hint={t("kpi.payRateHint")} icon={Percent} />
        <KpiCard
          label={t("kpi.newCustomers")}
          value={f.num(kpis.newCustomers)}
          hint={t("kpi.newCustomersHint")}
          icon={UserPlus}
        />
        <KpiCard
          label={t("kpi.pendingReviews")}
          value={f.num(kpis.pendingReviews)}
          hint={t("kpi.pendingReviewsHint")}
          icon={MessageSquareText}
          href="/admin/reviews"
        />
      </div>

      {/* الإيرادات — اللمسة المميزة: بطاقات بأسود العبوة وإطار ذهبي */}
      <Panel title={t("revenue.title")} subtitle={t("revenue.subtitle")}>
        {data.revenueByCurrency.length === 0 ? (
          <Empty>{t("revenue.empty")}</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.revenueByCurrency.map((r) => (
              <div key={r.currency} className="ds-card-ink p-5">
                <div className="flex items-center justify-between">
                  <span
                    dir="ltr"
                    className="rounded-full border border-[rgba(201,164,92,0.4)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-gold-light)]"
                  >
                    {r.currency}
                  </span>
                  <span className="text-xs text-[rgba(243,235,218,0.6)]">{t("ordersCount", { n: r.orders })}</span>
                </div>
                <p className="ds-font-heading mt-4 text-3xl font-bold tabular-nums text-[var(--brand-gold-light)]">
                  {f.money(r.total, r.currency)}
                </p>
                <p className="mt-1 text-xs text-[rgba(243,235,218,0.6)]">
                  {t("revenue.average", { value: f.money(r.orders ? r.total / r.orders : 0, r.currency) })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* الطلبات اليومية */}
      <Panel
        title={t("daily.title")}
        subtitle={
          peakDay.orders > 0
            ? t("daily.subtitle", {
                total: f.num(totalDaily),
                peak: f.num(peakDay.orders),
                date: f.date(peakDay.date),
              })
            : t("daily.empty")
        }
      >
        <DailyOrdersChart data={data.dailyOrders} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* الأكثر مبيعاً */}
        <Panel title={t("top.title")} subtitle={t("top.subtitle")}>
          {data.topProducts.length === 0 ? (
            <Empty>{t("top.empty")}</Empty>
          ) : (
            <ol className={`-my-3 ${rowDivider}`}>
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/products/${p.slug}`} className="min-w-0 truncate hover:underline">
                      <span className={`me-2 tabular-nums ${muted}`}>{f.num(i + 1)}.</span>
                      {pickName(f.isAr, p)}
                    </Link>
                    <span className={`shrink-0 text-xs ${muted}`}>{t("top.units", { n: f.num(p.unitsSold) })}</span>
                  </div>
                  <Bar pct={(p.unitsSold / maxUnits) * 100} />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* الطلبات حسب الحالة */}
        <Panel title={t("status.title")} subtitle={t("status.subtitle")}>
          {statuses.length === 0 ? (
            <Empty>{t("status.empty")}</Empty>
          ) : (
            <ul className={`-my-3 ${rowDivider}`}>
              {statuses.map((s) => (
                <li key={s.status} className="py-3">
                  <div className="flex items-center justify-between">
                    <OrderStatusBadge status={s.status as OrderStatusValue} />
                    <span className="text-sm font-semibold tabular-nums">{f.num(s.count)}</span>
                  </div>
                  <Bar pct={kpis.totalOrders ? (s.count / kpis.totalOrders) * 100 : 0} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* المبيعات حسب الدولة */}
        <Panel title={t("country.title")} subtitle={t("country.subtitle")}>
          {data.salesByCountry.length === 0 ? (
            <Empty>{t("country.empty")}</Empty>
          ) : (
            <ul className={`-my-3 ${rowDivider}`}>
              {data.salesByCountry.map((c) => (
                <li key={`${c.country}-${c.currency}`} className="py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {countryName(c.country)}
                      <span className={`ms-2 text-xs ${muted}`}>{t("ordersCount", { n: c.orders })}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{f.money(c.total, c.currency)}</span>
                  </div>
                  <Bar pct={(c.orders / maxCountry) * 100} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <LowStockPanel />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* الواجهة                                                             */
/* ------------------------------------------------------------------ */

export default function DashboardStats() {
  const t = useTranslations("adminPanel.dashboard");
  const f = useFormatters();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError, refetch } = useOverviewReport(days);
  const qc = useQueryClient();
  const fetching = useIsFetching({ predicate: isReportQuery }) > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="adm-heading">{t("title")}</h1>
          <p className={`mt-3 text-sm ${muted}`}>
            {data ? t("subtitleSince", { date: f.date(data.range.from) }) : t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div role="group" aria-label={t("rangeLabel")} className="adm-segment">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => setDays(r)}
                className="adm-tab"
              >
                {t("days", { n: r })}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ predicate: isReportQuery })}
            aria-label={t("refresh")}
            title={t("refresh")}
            className="adm-icon-btn"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
      </header>

      <div aria-hidden className="ds-dune-divider opacity-40" />

      {isError && !data ? (
        <ErrorBox onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className={fetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <Content data={data} />
        </div>
      )}
    </div>
  );
}