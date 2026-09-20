"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useMyOrders } from "@/hooks/useOrders";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { formatDateTime, formatMoney } from "@/lib/order-format";

export default function MyOrdersList() {
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyOrders(page);

  if (isLoading) return <p className="text-zinc-500">جارٍ تحميل طلباتك…</p>;
  if (isError) return <p className="text-red-600">تعذّر تحميل الطلبات. سجّل الدخول وحاول مجدداً.</p>;

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="mb-3">لم تقم بأي طلب بعد.</p>
        <Link href="/products" className="underline underline-offset-2">
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {data.items.map((o) => (
          <li key={o.id}>
            <Link
              href={`/account/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <div>
                <p className="font-mono text-sm">#{o.id.slice(-8)}</p>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(o.createdAt, locale)} · {o._count.items} منتج
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{formatMoney(o.total, o.currency, locale)}</span>
                <OrderStatusBadge status={o.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
          >
            السابق
          </button>
          <span className="text-zinc-500">
            {data.meta.page} / {data.meta.totalPages}
          </span>
          <button
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}