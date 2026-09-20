"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { getApiErrorMessage } from "@/services/orders.service";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { OrderTimeline } from "@/components/ui/OrderTimeline";
import {
  ORDER_STATUS_LABELS,
  allowedNextStatusesForAdmin,
  type OrderStatusValue,
} from "@/modules/orders/order-status";
import { formatDateTime, formatMoney } from "@/lib/order-format";

const CONFIRM_TEXT: Partial<Record<OrderStatusValue, string>> = {
  CANCELLED: "سيتم إلغاء الطلب، وإذا كان مدفوعاً فسيُسترد المبلغ كاملاً وتعود الكمية للمخزون. متابعة؟",
  REFUNDED: "سيتم استرداد المبلغ كاملاً للعميل عبر بوابة الدفع. لا يمكن التراجع. متابعة؟",
};

export default function OrderDetail({ id }: { id: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { data: order, isLoading, isError } = useAdminOrder(id);
  const mutation = useUpdateOrderStatus(id);

  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-zinc-500">جارٍ التحميل…</p>;
  if (isError || !order) return <p className="text-red-600">الطلب غير موجود أو تعذّر تحميله.</p>;

  const next = allowedNextStatusesForAdmin(order.status);
  const money = (v: string) => formatMoney(v, order.currency, locale);

  function apply(status: OrderStatusValue) {
    const msg = CONFIRM_TEXT[status];
    if (msg && !window.confirm(msg)) return;
    setError(null);
    mutation.mutate(
      { status, note: note || undefined, restock: status === "RETURNED" ? restock : undefined },
      {
        onSuccess: () => {
          setNote("");
          setRestock(false);
        },
        onError: (e) => setError(getApiErrorMessage(e)),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-zinc-500 underline underline-offset-2">
            كل الطلبات
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            طلب <span className="font-mono">{order.id.slice(-8)}</span>
          </h1>
          <p className="text-sm text-zinc-500">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="flex gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-start text-zinc-600 dark:text-zinc-400">
                  <th className="px-4 py-3 text-start font-medium">المنتج</th>
                  <th className="px-4 py-3 text-start font-medium">الكمية</th>
                  <th className="px-4 py-3 text-start font-medium">السعر</th>
                  <th className="px-4 py-3 text-start font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <div>{lang === "ar" ? it.product.nameAr : it.product.nameEn}</div>
                      {it.variant && <div className="text-xs text-zinc-500">{it.variant.name}</div>}
                    </td>
                    <td className="px-4 py-3">{it.quantity}</td>
                    <td className="px-4 py-3">{money(it.price)}</td>
                    <td className="px-4 py-3">{money(String(Number(it.price) * it.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <h2 className="mb-2 font-medium">العميل</h2>
              <p>{order.user?.name ?? "زائر"}</p>
              <p className="text-zinc-500">{order.user?.email ?? order.guestEmail}</p>
              {order.coupon && <p className="mt-2 text-zinc-500">كوبون: {order.coupon.code}</p>}
              {order.vatNumber && <p className="text-zinc-500">الرقم الضريبي: {order.vatNumber}</p>}
              {order.notes && <p className="mt-2">ملاحظات: {order.notes}</p>}
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <h2 className="mb-2 font-medium">عنوان الشحن</h2>
              {order.shippingAddress ? (
                <address className="not-italic">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}، {order.shippingAddress.country}
                    {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                  </p>
                  <p className="text-zinc-500" dir="ltr">
                    {order.shippingAddress.phone}
                  </p>
                </address>
              ) : (
                <p className="text-zinc-500">لا يوجد عنوان محفوظ</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                الدفع: {order.paymentMethod} {order.paymentRef && `· ${order.paymentRef}`}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 text-sm font-medium">تحديث الحالة</h2>
            {next.length === 0 ? (
              <p className="text-sm text-zinc-500">هذه حالة نهائية، لا توجد إجراءات متاحة.</p>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="ملاحظة تُحفظ في سجل الطلب (اختياري)"
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
                {next.includes("RETURNED") && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                    إعادة الكمية للمخزون عند الإرجاع
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => {
                    const destructive = s === "CANCELLED" || s === "REFUNDED";
                    return (
                      <button
                        key={s}
                        disabled={mutation.isPending}
                        onClick={() => apply(s)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                          destructive
                            ? "border border-red-300 text-red-700 dark:border-red-500/40 dark:text-red-300"
                            : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[s][lang]}
                      </button>
                    );
                  })}
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 text-sm font-medium">سجل الحالات</h2>
            <OrderTimeline history={order.statusHistory} showNotes />
          </section>
        </aside>
      </div>
    </div>
  );
}