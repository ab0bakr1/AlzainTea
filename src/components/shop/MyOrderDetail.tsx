"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useCancelMyOrder, useMyOrder } from "@/hooks/useOrders";
import { getApiErrorMessage } from "@/services/orders.service";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { OrderTimeline } from "@/components/ui/OrderTimeline";
import { CUSTOMER_CANCELLABLE_STATUSES } from "@/modules/orders/order-status";
import { formatDateTime, formatMoney } from "@/lib/order-format";

export default function MyOrderDetail({ id }: { id: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { data: order, isLoading, isError } = useMyOrder(id);
  const cancel = useCancelMyOrder(id);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-zinc-500">جارٍ التحميل…</p>;
  if (isError || !order) return <p className="text-red-600">الطلب غير موجود.</p>;

  const money = (v: string) => formatMoney(v, order.currency, locale);
  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);

  function onCancel() {
    const paid = order?.paymentStatus === "PAID";
    const msg = paid
      ? "سيتم إلغاء الطلب واسترداد المبلغ إلى وسيلة الدفع الأصلية. متابعة؟"
      : "هل تريد إلغاء هذا الطلب؟";
    if (!window.confirm(msg)) return;
    setError(null);
    cancel.mutate(undefined, { onError: (e) => setError(getApiErrorMessage(e)) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-zinc-500 underline underline-offset-2">
            طلباتي
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            طلب <span className="font-mono">#{order.id.slice(-8)}</span>
          </h1>
          <p className="text-sm text-zinc-500">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="flex gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <Link href={`/products/${it.product.slug}`} className="underline underline-offset-2">
                  {lang === "ar" ? it.product.nameAr : it.product.nameEn}
                </Link>
                {it.variant && <span className="text-zinc-500"> — {it.variant.name}</span>}
                <p className="text-xs text-zinc-500">
                  {it.quantity} × {money(it.price)}
                </p>
              </div>
              <span>{money(String(Number(it.price) * it.quantity))}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-zinc-200 p-4 text-sm dark:border-zinc-800">
          {[
            ["المجموع الفرعي", order.subtotal],
            ["الخصم", order.discount],
            ["الشحن", order.shippingCost],
            ["الضريبة", order.tax],
          ].map(([label, v]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-zinc-500">{label}</dt>
              <dd>{money(v)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
            <dt>الإجمالي</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-medium">تتبع الطلب</h2>
          <OrderTimeline history={order.statusHistory} />
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div>
            <h2 className="mb-2 font-medium">عنوان الشحن</h2>
            {order.shippingAddress ? (
              <address className="not-italic text-zinc-600 dark:text-zinc-400">
                <p>{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}، {order.shippingAddress.country}
                </p>
              </address>
            ) : (
              <p className="text-zinc-500">—</p>
            )}
          </div>

          {canCancel && (
            <div>
              <button
                onClick={onCancel}
                disabled={cancel.isPending}
                className="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 disabled:opacity-50 dark:border-red-500/40 dark:text-red-300"
              >
                {cancel.isPending ? "جارٍ الإلغاء…" : "إلغاء الطلب"}
              </button>
              {error && (
                <p role="alert" className="mt-2 text-red-600">
                  {error}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}