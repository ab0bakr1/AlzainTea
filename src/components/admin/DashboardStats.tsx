"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
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

const LOCALE = "ar-u-nu-latn";
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

const fmtNum = (n: number) => new Intl.NumberFormat(LOCALE).format(n);
const fmtPercent = (ratio: number) => new Intl.NumberFormat(LOCALE, { style: "percent" }).format(ratio);
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
const money = (value: number, currency: string) => formatMoney(value, currency, LOCALE);

const isReportQuery = (q: { queryKey: readonly unknown[] }) =>
  (ADMIN_REPORT_KEYS as readonly string[]).includes(String(q.queryKey[0]));

const muted = "text-[var(--color-text-secondary)]";
const card = "rounded-2xl border border-black/10 bg-[var(--color-bg)] shadow-sm dark:border-white/10";
const rowDivider = "divide-y divide-black/5 dark:divide-white/10";

/* ------------------------------------------------------------------ */
/* عناصر مساعدة                                                        */
/* ------------------------------------------------------------------ */

const Pulse = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-black/5 dark:bg-white/10 ${className}`} />
);

const Empty = ({ children }: { children: ReactNode }) => (
  <p className={`py-6 text-center text-sm ${muted}`}>{children}</p>
);

function Bar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(2, pct)}%` }} />
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
      <header className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className={`mt-0.5 text-xs ${muted}`}>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
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
    <div className={`${card} flex items-start gap-4 p-5 ${href ? "transition-colors hover:border-[var(--color-primary)]" : ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`text-sm ${muted}`}>{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className={`mt-0.5 text-xs ${muted}`}>{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      <AlertTriangle className="h-6 w-6" aria-hidden />
      <p className="font-medium">تعذّر تحميل التقارير. تأكد من اتصالك ثم أعد المحاولة.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جارٍ تحميل البيانات">
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
  const [threshold, setThreshold] = useState<number>(5);
  const { data, isLoading, isError, refetch } = useLowStockReport(threshold);

  return (
    <Panel
      title="تنبيهات المخزون المنخفض"
      subtitle="المتاح = المخزون − المحجوز للطلبات غير المدفوعة"
      action={
        <select
          aria-label="حد التنبيه"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="rounded-lg border border-black/10 bg-[var(--color-bg)] px-2 py-1 text-xs dark:border-white/10"
        >
          {THRESHOLDS.map((t) => (
            <option key={t} value={t}>
              متاح ≤ {t}
            </option>
          ))}
        </select>
      }
    >
      {isError ? (
        <div className="py-4 text-center text-sm">
          <p className="text-red-700 dark:text-red-300">تعذّر تحميل تنبيهات المخزون</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-[var(--color-primary)] hover:underline">
            إعادة المحاولة
          </button>
        </div>
      ) : isLoading || !data ? (
        <Pulse className="h-40" />
      ) : data.items.length === 0 ? (
        <Empty>كل المنتجات النشطة بمخزون كافٍ</Empty>
      ) : (
        <>
          <ul className={`-my-3 ${rowDivider}`}>
            {data.items.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/admin/products/${p.id}`} className="min-w-0 hover:underline">
                  <span className="block truncate text-sm font-medium">{p.nameAr}</span>
                  <span dir="ltr" className={`block text-start text-xs ${muted}`}>
                    {p.sku}
                  </span>
                </Link>
                <div className="shrink-0 text-end">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.available <= 0
                        ? "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
                    }`}
                  >
                    {p.available <= 0 ? "نفد" : `متاح ${fmtNum(p.available)}`}
                  </span>
                  {p.reservedStock > 0 && <p className={`mt-1 text-xs ${muted}`}>محجوز {fmtNum(p.reservedStock)}</p>}
                </div>
              </li>
            ))}
          </ul>
          {data.items.length >= 20 && <p className={`mt-4 text-xs ${muted}`}>يُعرض أول 20 منتجاً الأقرب للنفاد.</p>}
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* المحتوى الرئيسي                                                     */
/* ------------------------------------------------------------------ */

function Content({ data }: { data: OverviewReport }) {
  const countryNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["ar"], { type: "region" });
    } catch {
      return null;
    }
  }, []);
  const countryName = (code: string) => countryNames?.of(code) ?? code;

  const { kpis } = data;
  const confirmed = data.ordersByStatus.find((s) => s.status === "CONFIRMED")?.count ?? 0;
  const payRate = kpis.totalOrders ? kpis.paidOrders / kpis.totalOrders : 0;

  const actions = [
    { label: "مراجعات بانتظار الاعتماد", count: kpis.pendingReviews, href: "/admin/reviews" },
    { label: "طلبات مؤكدة بانتظار التجهيز", count: confirmed, href: "/admin/orders" },
    { label: "منتجات بمخزون منخفض", count: data.lowStock.length, href: "/admin/products" },
  ].filter((a) => a.count > 0);

  const totalDaily = data.dailyOrders.reduce((s, d) => s + d.orders, 0);
  const peakDay = data.dailyOrders.reduce((a, d) => (d.orders > a.orders ? d : a), { date: "", orders: 0 });

  const maxUnits = Math.max(1, ...data.topProducts.map((p) => p.unitsSold));
  const maxCountry = Math.max(1, ...data.salesByCountry.map((c) => c.orders));
  const statuses = [...data.ordersByStatus].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      {/* إجراءات تحتاج انتباهك */}
      {actions.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          لا توجد إجراءات معلّقة الآن.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-amber-950 transition-colors hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <span className="text-sm">
                <span className="me-2 text-lg font-bold tabular-nums">{fmtNum(a.count)}</span>
                {a.label}
              </span>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      {/* المؤشرات */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="الطلبات المدفوعة"
          value={fmtNum(kpis.paidOrders)}
          hint={`من أصل ${fmtNum(kpis.totalOrders)} طلب`}
          icon={CircleDollarSign}
        />
        <KpiCard label="نسبة الطلبات المدفوعة" value={fmtPercent(payRate)} hint="مدفوع ÷ كل الطلبات" icon={Percent} />
        <KpiCard label="عملاء جدد" value={fmtNum(kpis.newCustomers)} hint="تسجيلات في الفترة" icon={UserPlus} />
        <KpiCard
          label="مراجعات بانتظار الاعتماد"
          value={fmtNum(kpis.pendingReviews)}
          hint="افتح صفحة المراجعات"
          icon={MessageSquareText}
          href="/admin/reviews"
        />
      </div>

      {/* الإيرادات */}
      <Panel title="الإيرادات" subtitle="الإجمالي شامل الشحن والضريبة، ويُعرض لكل عملة على حدة دون تحويل بينها">
        {data.revenueByCurrency.length === 0 ? (
          <Empty>لا توجد مبيعات مدفوعة في هذه الفترة</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.revenueByCurrency.map((r) => (
              <div key={r.currency} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span dir="ltr" className="rounded-md bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                    {r.currency}
                  </span>
                  <span className={`text-xs ${muted}`}>{fmtNum(r.orders)} طلب</span>
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums">{money(r.total, r.currency)}</p>
                <p className={`mt-1 text-xs ${muted}`}>متوسط الطلب {money(r.orders ? r.total / r.orders : 0, r.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* الطلبات اليومية */}
      <Panel
        title="الطلبات المدفوعة يومياً"
        subtitle={
          peakDay.orders > 0
            ? `${fmtNum(totalDaily)} طلب في الفترة، وأعلى يوم ${fmtNum(peakDay.orders)} طلب (${fmtDate(peakDay.date)})`
            : "لا توجد طلبات مدفوعة في هذه الفترة"
        }
      >
        <DailyOrdersChart data={data.dailyOrders} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* الأكثر مبيعاً */}
        <Panel title="الأكثر مبيعاً" subtitle="حسب عدد الوحدات المباعة">
          {data.topProducts.length === 0 ? (
            <Empty>لا توجد مبيعات بعد</Empty>
          ) : (
            <ol className={`-my-3 ${rowDivider}`}>
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/products/${p.slug}`} className="min-w-0 truncate hover:underline">
                      <span className={`me-2 tabular-nums ${muted}`}>{fmtNum(i + 1)}.</span>
                      {p.nameAr}
                    </Link>
                    <span className={`shrink-0 text-xs ${muted}`}>{fmtNum(p.unitsSold)} وحدة</span>
                  </div>
                  <Bar pct={(p.unitsSold / maxUnits) * 100} />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* الطلبات حسب الحالة */}
        <Panel title="الطلبات حسب الحالة" subtitle="الطلبات المنشأة خلال الفترة المحددة">
          {statuses.length === 0 ? (
            <Empty>لا توجد طلبات في هذه الفترة</Empty>
          ) : (
            <ul className={`-my-3 ${rowDivider}`}>
              {statuses.map((s) => (
                <li key={s.status} className="py-3">
                  <div className="flex items-center justify-between">
                    <OrderStatusBadge status={s.status as OrderStatusValue} />
                    <span className="text-sm font-semibold tabular-nums">{fmtNum(s.count)}</span>
                  </div>
                  <Bar pct={kpis.totalOrders ? (s.count / kpis.totalOrders) * 100 : 0} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* المبيعات حسب الدولة */}
        <Panel title="المبيعات حسب الدولة" subtitle="مرتبة حسب عدد الطلبات المدفوعة">
          {data.salesByCountry.length === 0 ? (
            <Empty>لا توجد مبيعات بعد</Empty>
          ) : (
            <ul className={`-my-3 ${rowDivider}`}>
              {data.salesByCountry.map((c) => (
                <li key={`${c.country}-${c.currency}`} className="py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {countryName(c.country)}
                      <span className={`ms-2 text-xs ${muted}`}>{fmtNum(c.orders)} طلب</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{money(c.total, c.currency)}</span>
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
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError, refetch } = useOverviewReport(days);
  const qc = useQueryClient();
  const fetching = useIsFetching({ predicate: isReportQuery }) > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            {data ? `أداء المتجر منذ ${fmtDate(data.range.from)}` : "أداء المتجر"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="الفترة الزمنية"
            className="inline-flex rounded-xl border border-black/10 bg-[var(--color-bg)] p-1 dark:border-white/10"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => setDays(r)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  days === r
                    ? "bg-[var(--color-primary)] text-white"
                    : `${muted} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                {r} يوماً
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ predicate: isReportQuery })}
            aria-label="تحديث البيانات"
            title="تحديث البيانات"
            className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-[var(--color-bg)] hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
      </header>

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