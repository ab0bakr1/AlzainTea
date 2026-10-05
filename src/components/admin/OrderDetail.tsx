"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { getApiErrorMessage, type OrderDetail as OrderDetailData } from "@/services/orders.service";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { OrderTimeline } from "@/components/ui/OrderTimeline";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ORDER_STATUS_LABELS,
  allowedNextStatusesForAdmin,
  isTerminalStatus,
  planTransition,
  type OrderStatusValue,
} from "@/modules/orders/order-status";
import { formatDateTime, formatMoney } from "@/lib/order-format";

/**
 * يعرض أثر الانتقال قبل تنفيذه (استرداد / مخزون) بنفس دالة planTransition
 * التي يستخدمها الخادم، فلا يختلف ما يراه المدير عما سيحدث فعلاً.
 */
function buildImpact(
  order: OrderDetailData,
  to: OrderStatusValue,
  restock: boolean,
  money: (v: string) => string
) {
  const d = planTransition(
    { status: order.status, paymentStatus: order.paymentStatus },
    to,
    { restock }
  );
  if (!d.ok) return { blocked: d.message, lines: [] as string[], irreversible: false };

  const lines: string[] = [];
  if (d.plan.refund) {
    lines.push(`سيُسترد ${money(order.total)} كاملاً للعميل عبر ${order.paymentMethod}.`);
  }
  if (d.plan.stock === "RESTOCK") lines.push("ستعود كميات المنتجات إلى المخزون المتاح.");
  if (d.plan.stock === "RELEASE_RESERVED") lines.push("سيُحرَّر المخزون المحجوز لهذا الطلب.");
  return { blocked: null, lines, irreversible: isTerminalStatus(to) };
}

export default function OrderDetail({ id }: { id: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const { data: order, isLoading, isError, refetch, isFetching } = useAdminOrder(id);
  const mutation = useUpdateOrderStatus(id);

  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(false);
  const [pending, setPending] = useState<OrderStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <p className="text-zinc-500">جارٍ تحميل الطلب…</p>;
  if (isError || !order) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">الطلب غير موجود أو تعذّر تحميله.</p>
        <div className="flex gap-4 text-sm">
          <button onClick={() => refetch()} className="underline underline-offset-2">
            إعادة المحاولة
          </button>
          <Link href="/admin/orders" className="underline underline-offset-2">
            العودة إلى الطلبات
          </Link>
        </div>
      </div>
    );
  }

  const current = order;
  const next = allowedNextStatusesForAdmin(current.status);
  const money = (v: string) => formatMoney(v, current.currency, locale);

  function run(status: OrderStatusValue) {
    setError(null);
    setDone(null);
    mutation.mutate(
      { status, note: note || undefined, restock: status === "RETURNED" ? restock : undefined },
      {
        onSuccess: () => {
          setNote("");
          setRestock(false);
          setPending(null);
          setDone(`تم تحديث الحالة إلى «${ORDER_STATUS_LABELS[status][lang]}».`);
          setTimeout(() => setDone(null), 5000);
        },
        onError: (e) => {
          setPending(null);
          setError(getApiErrorMessage(e));
        },
      }
    );
  }

  function apply(status: OrderStatusValue) {
    const impact = buildImpact(current, status, restock, money);
    // الانتقالات ذات الأثر المالي/المخزني أو النهائية تمر عبر نافذة تأكيد
    if (impact.lines.length > 0 || impact.irreversible) setPending(status);
    else run(status);
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(current.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الحافظة غير متاحة */
    }
  }

  const pendingImpact = pending ? buildImpact(current, pending, restock, money) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-zinc-500 underline underline-offset-2">
            كل الطلبات
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            طلب <span className="font-mono">{current.id.slice(-8)}</span>
          </h1>
          <p className="text-sm text-zinc-500">
            {formatDateTime(current.createdAt, locale)} ·{" "}
            <button onClick={copyId} className="underline underline-offset-2">
              {copied ? "تم النسخ" : "نسخ المعرّف الكامل"}
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-zinc-700"
          >
            {isFetching ? "جارٍ التحديث…" : "تحديث"}
          </button>
          <PaymentStatusBadge status={current.paymentStatus} />
          <OrderStatusBadge status={current.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-zinc-600 dark:text-zinc-400">
                  <th className="px-4 py-3 text-start font-medium">المنتج</th>
                  <th className="px-4 py-3 text-start font-medium">الكمية</th>
                  <th className="px-4 py-3 text-start font-medium">السعر</th>
                  <th className="px-4 py-3 text-start font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {current.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <Link href={`/products/${it.product.slug}`} className="hover:underline">
                        {lang === "ar" ? it.product.nameAr : it.product.nameEn}
                      </Link>
                      {it.variant && (
                        <div className="text-xs text-zinc-500">
                          {it.variant.name} · {it.variant.sku}
                        </div>
                      )}
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
                ["المجموع الفرعي", current.subtotal],
                ["الخصم", current.discount],
                ["الشحن", current.shippingCost],
                ["الضريبة", current.tax],
              ].map(([label, v]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd>{money(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                <dt>الإجمالي</dt>
                <dd>{money(current.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <h2 className="mb-2 font-medium">العميل</h2>
              <p>{current.user?.name ?? "زائر"}</p>
              <p className="text-zinc-500">{current.user?.email ?? current.guestEmail}</p>
              {current.coupon && <p className="mt-2 text-zinc-500">كوبون: {current.coupon.code}</p>}
              {current.vatNumber && <p className="text-zinc-500">الرقم الضريبي: {current.vatNumber}</p>}
              {current.notes && <p className="mt-2">ملاحظات العميل: {current.notes}</p>}
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <h2 className="mb-2 font-medium">عنوان الشحن</h2>
              {current.shippingAddress ? (
                <address className="not-italic">
                  <p>{current.shippingAddress.fullName}</p>
                  <p>{current.shippingAddress.street}</p>
                  <p>
                    {current.shippingAddress.city}، {current.shippingAddress.country}
                    {current.shippingAddress.postalCode && ` ${current.shippingAddress.postalCode}`}
                  </p>
                  <p className="text-zinc-500" dir="ltr">
                    {current.shippingAddress.phone}
                  </p>
                </address>
              ) : (
                <p className="text-zinc-500">لا يوجد عنوان محفوظ</p>
              )}
              <p className="mt-2 break-all text-xs text-zinc-500">
                الدفع: {current.paymentMethod} {current.paymentRef && `· ${current.paymentRef}`}
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
                  aria-label="ملاحظة داخلية"
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
                    const { blocked } = buildImpact(current, s, restock, money);
                    return (
                      <button
                        key={s}
                        disabled={mutation.isPending || !!blocked}
                        title={blocked ?? undefined}
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
            {done && (
              <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
                {done}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 text-sm font-medium">سجل الحالات</h2>
            <OrderTimeline history={current.statusHistory} showNotes />
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `نقل الطلب إلى «${ORDER_STATUS_LABELS[pending][lang]}»` : ""}
        confirmLabel={pending ? ORDER_STATUS_LABELS[pending][lang] : "تأكيد"}
        destructive={pending === "CANCELLED" || pending === "REFUNDED"}
        loading={mutation.isPending}
        onConfirm={() => pending && run(pending)}
        onCancel={() => setPending(null)}
      >
        {pendingImpact?.lines.length ? (
          <ul className="list-disc space-y-1 ps-5">
            {pendingImpact.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
        {pendingImpact?.irreversible && (
          <p className="font-medium text-red-600 dark:text-red-400">
            هذه حالة نهائية ولا يمكن التراجع عنها.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}