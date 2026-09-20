"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAdminOrders } from "@/hooks/useOrders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatusValue,
} from "@/modules/orders/order-status";
import { formatDateTime, formatMoney } from "@/lib/order-format";

export default function OrdersTable() {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatusValue | "">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  // Debounce للبحث النصي
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, isFetching } = useAdminOrders({ page, status, q, limit: 20 });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو البريد أو الاسم"
          className="w-full max-w-sm rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatusValue | "");
            setPage(1);
          }}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        >
          <option value="">كل الحالات</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s][lang]}
            </option>
          ))}
        </select>
        {isFetching && <span className="text-xs text-zinc-500">جارٍ التحديث…</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-zinc-50 text-start text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              {["الطلب", "العميل", "الدولة", "الإجمالي", "الدفع", "الحالة", "التاريخ"].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  جارٍ التحميل…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                  تعذّر تحميل الطلبات. حدّث الصفحة وحاول مجدداً.
                </td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  لا توجد طلبات مطابقة. جرّب تغيير الفلتر أو كلمة البحث.
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
                <td className="px-4 py-3 whitespace-nowrap">{formatMoney(o.total, o.currency, locale)}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={o.paymentStatus} />
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                  {formatDateTime(o.createdAt, locale)}
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
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
            >
              السابق
            </button>
            <button
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
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