"use client";

import Link from "next/link";
import { useState } from "react";
import { useOverviewReport } from "@/hooks/useAdminReports";

const RANGES = [7, 30, 90] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "بانتظار الدفع",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
  RETURNED: "مرتجع",
  REFUNDED: "مسترد",
  FAILED: "فشل",
};

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("ar-u-nu-latn", { style: "currency", currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
};

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["ar"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

function Card({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardStats() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError } = useOverviewReport(days);

  if (isError) return <p className="text-red-600">تعذّر تحميل التقارير</p>;
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;

  const maxDaily = Math.max(1, ...data.dailyOrders.map((d) => d.orders));

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`rounded-full border px-4 py-1.5 text-sm ${days === r ? "bg-green-700 text-white" : ""}`}
          >
            آخر {r} يوماً
          </button>
        ))}
      </div>

      {/* المؤشرات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="الطلبات المدفوعة" value={data.kpis.paidOrders} />
        <Card label="إجمالي الطلبات" value={data.kpis.totalOrders} />
        <Card label="عملاء جدد" value={data.kpis.newCustomers} />
        <Card label="مراجعات بانتظار القبول" value={data.kpis.pendingReviews} href="/admin/reviews" />
      </div>

      {/* الإيرادات لكل عملة */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">الإيرادات</h2>
        <p className="mb-3 text-xs text-gray-500">تُعرض لكل عملة على حدة دون تحويل بين العملات.</p>
        {data.revenueByCurrency.length === 0 ? (
          <p className="text-gray-500">لا توجد مبيعات في هذه الفترة</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {data.revenueByCurrency.map((r) => (
              <Card key={r.currency} label={`${r.currency} — ${r.orders} طلب`} value={money(r.total, r.currency)} />
            ))}
          </div>
        )}
      </section>

      {/* مخطط الطلبات اليومية */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">الطلبات المدفوعة يومياً</h2>
        <div className="flex h-36 items-end gap-px rounded-xl border p-3">
          {data.dailyOrders.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.orders}`}
              className="flex-1 rounded-t bg-green-600/80 transition hover:bg-green-700"
              style={{ height: `${(d.orders / maxDaily) * 100}%`, minHeight: d.orders ? 2 : 1 }}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* الأكثر مبيعاً */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">الأكثر مبيعاً</h2>
          <ol className="divide-y rounded-xl border">
            {data.topProducts.length === 0 && <li className="p-4 text-gray-500">لا توجد بيانات</li>}
            {data.topProducts.map((p, i) => (
              <li key={p.productId} className="flex items-center justify-between p-3">
                <span>
                  <span className="me-2 text-gray-400">{i + 1}.</span>
                  {p.nameAr}
                </span>
                <span className="text-sm text-gray-500">{p.unitsSold} وحدة</span>
              </li>
            ))}
          </ol>
        </section>

        {/* حالات الطلبات */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">الطلبات حسب الحالة</h2>
          <ul className="divide-y rounded-xl border">
            {data.ordersByStatus.length === 0 && <li className="p-4 text-gray-500">لا توجد بيانات</li>}
            {data.ordersByStatus.map((s) => (
              <li key={s.status} className="flex items-center justify-between p-3">
                <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                <span className="font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* المبيعات حسب الدولة */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">المبيعات حسب الدولة</h2>
          <ul className="divide-y rounded-xl border">
            {data.salesByCountry.length === 0 && <li className="p-4 text-gray-500">لا توجد بيانات</li>}
            {data.salesByCountry.map((c) => (
              <li key={`${c.country}-${c.currency}`} className="flex items-center justify-between p-3">
                <span>
                  {countryName(c.country)} <span className="text-xs text-gray-400">({c.orders} طلب)</span>
                </span>
                <span className="text-sm">{money(c.total, c.currency)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* مخزون منخفض */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">تنبيه مخزون منخفض</h2>
          <ul className="divide-y rounded-xl border">
            {data.lowStock.length === 0 && <li className="p-4 text-gray-500">كل المنتجات بمخزون كافٍ ✅</li>}
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3">
                <Link href={`/admin/products/${p.id}`} className="hover:underline">
                  {p.nameAr} <span className="text-xs text-gray-400">{p.sku}</span>
                </Link>
                <span className={`text-sm font-medium ${p.available <= 0 ? "text-red-600" : "text-amber-600"}`}>
                  متاح: {p.available}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}