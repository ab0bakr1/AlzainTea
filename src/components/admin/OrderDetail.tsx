"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * يعرض أثر الانتقال قبل تنفيذه (استرداد / مخزون) بنفس دالة planTransition
 * التي يستخدمها الخادم، فلا يختلف ما يراه المدير عما سيحدث فعلاً.
 */
function buildImpact(
  order: OrderDetailData,
  to: OrderStatusValue,
  restock: boolean,
  money: (v: string) => string,
  t: T,
) {
  const d = planTransition({ status: order.status, paymentStatus: order.paymentStatus }, to, { restock });
  if (!d.ok) return { blocked: d.message, lines: [] as string[], irreversible: false };

  const lines: string[] = [];
  if (d.plan.refund) {
    lines.push(t("impact.refund", { amount: money(order.total), method: order.paymentMethod }));
  }
  if (d.plan.stock === "RESTOCK") lines.push(t("impact.restock"));
  if (d.plan.stock === "RELEASE_RESERVED") lines.push(t("impact.release"));
  return { blocked: null, lines, irreversible: isTerminalStatus(to) };
}

const panel = "adm-card p-5";

export default function OrderDetail({ id }: { id: string }) {
  const tt = useTranslations("adminPanel.orderDetail");
  const t = tt as unknown as T;
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

  if (isLoading) return <p className="adm-subtle">{tt("loading")}</p>;
  if (isError || !order) {
    return (
      <div className="adm-alert adm-alert-error space-y-2 p-6">
        <p>{tt("notFound")}</p>
        <div className="flex gap-4 text-sm">
          <button onClick={() => refetch()} className="underline underline-offset-2">
            {tt("retry")}
          </button>
          <Link href="/admin/orders" className="underline underline-offset-2">
            {tt("backToOrders")}
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
          setDone(tt("statusUpdated", { status: ORDER_STATUS_LABELS[status][lang] }));
          setTimeout(() => setDone(null), 5000);
        },
        onError: (e) => {
          setPending(null);
          setError(getApiErrorMessage(e));
        },
      },
    );
  }

  function apply(status: OrderStatusValue) {
    const impact = buildImpact(current, status, restock, money, t);
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

  const pendingImpact = pending ? buildImpact(current, pending, restock, money, t) : null;

  const summary: [string, string][] = [
    [tt("summary.subtotal"), current.subtotal],
    [tt("summary.discount"), current.discount],
    [tt("summary.shipping"), current.shippingCost],
    [tt("summary.tax"), current.tax],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="adm-link text-sm">
            {tt("allOrders")}
          </Link>
          <h1 className="adm-heading mt-2">
            {tt("orderLabel")} <span className="font-mono">{current.id.slice(-8)}</span>
          </h1>
          <p className="adm-subtle mt-3 text-sm">
            {formatDateTime(current.createdAt, locale)} ·{" "}
            <button onClick={copyId} className="adm-link">
              {copied ? tt("copied") : tt("copyId")}
            </button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="ds-btn ds-btn-outline adm-btn-sm">
            {isFetching ? tt("refreshing") : tt("refresh")}
          </button>
          <PaymentStatusBadge status={current.paymentStatus} />
          <OrderStatusBadge status={current.status} />
        </div>
      </div>

      <div aria-hidden className="ds-dune-divider opacity-40" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="adm-table-wrap">
            <table className="adm-table min-w-[520px]">
              <thead>
                <tr>
                  <th>{tt("table.product")}</th>
                  <th>{tt("table.quantity")}</th>
                  <th>{tt("table.price")}</th>
                  <th>{tt("table.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {current.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <Link href={`/products/${it.product.slug}`} className="font-medium hover:underline">
                        {lang === "ar" ? it.product.nameAr : it.product.nameEn}
                      </Link>
                      {it.variant && (
                        <div className="adm-subtle text-xs">
                          {it.variant.name} · {it.variant.sku}
                        </div>
                      )}
                    </td>
                    <td className="tabular-nums">{it.quantity}</td>
                    <td className="tabular-nums">{money(it.price)}</td>
                    <td className="font-semibold tabular-nums">{money(String(Number(it.price) * it.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-2 border-t border-[var(--border-color)] bg-[var(--color-bg-alt)] p-5 text-sm">
              {summary.map(([label, v]) => (
                <div key={label} className="flex justify-between">
                  <dt className="adm-subtle">{label}</dt>
                  <dd className="tabular-nums">{money(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-[var(--border-color)] pt-3">
                <dt className="ds-font-heading text-base font-bold">{tt("summary.total")}</dt>
                <dd className="ds-font-heading ds-text-alt text-xl font-bold tabular-nums">{money(current.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className={`${panel} text-sm`}>
              <h2 className="ds-font-heading mb-3 text-base font-bold">{tt("customer.title")}</h2>
              <p>{current.user?.name ?? tt("customer.guest")}</p>
              <p className="adm-subtle">{current.user?.email ?? current.guestEmail}</p>
              {current.coupon && <p className="adm-subtle mt-2">{tt("customer.coupon", { code: current.coupon.code })}</p>}
              {current.vatNumber && <p className="adm-subtle">{tt("customer.vat", { vat: current.vatNumber })}</p>}
              {current.notes && <p className="mt-2">{tt("customer.notes", { notes: current.notes })}</p>}
            </div>
            <div className={`${panel} text-sm`}>
              <h2 className="ds-font-heading mb-3 text-base font-bold">{tt("shipping.title")}</h2>
              {current.shippingAddress ? (
                <address className="not-italic">
                  <p>{current.shippingAddress.fullName}</p>
                  <p>{current.shippingAddress.street}</p>
                  <p>
                    {current.shippingAddress.city}
                    {tt("shipping.comma")} {current.shippingAddress.country}
                    {current.shippingAddress.postalCode && ` ${current.shippingAddress.postalCode}`}
                  </p>
                  <p className="adm-subtle" dir="ltr">
                    {current.shippingAddress.phone}
                  </p>
                </address>
              ) : (
                <p className="adm-subtle">{tt("shipping.none")}</p>
              )}
              <p className="adm-subtle mt-3 break-all text-xs">
                {tt("shipping.payment", { method: current.paymentMethod })} {current.paymentRef && `· ${current.paymentRef}`}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={panel}>
            <h2 className="ds-font-heading mb-4 text-base font-bold">{tt("update.title")}</h2>
            {next.length === 0 ? (
              <p className="adm-subtle text-sm">{tt("update.terminal")}</p>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  aria-label={tt("update.noteAria")}
                  placeholder={tt("update.notePlaceholder")}
                  className="adm-control w-full"
                />
                {next.includes("RETURNED") && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="adm-check"
                      checked={restock}
                      onChange={(e) => setRestock(e.target.checked)}
                    />
                    {tt("update.restock")}
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => {
                    const destructive = s === "CANCELLED" || s === "REFUNDED";
                    const { blocked } = buildImpact(current, s, restock, money, t);
                    return (
                      <button
                        key={s}
                        disabled={mutation.isPending || !!blocked}
                        title={blocked ?? undefined}
                        onClick={() => apply(s)}
                        className={`ds-btn adm-btn-sm ${destructive ? "adm-btn-danger" : "ds-btn-primary"}`}
                      >
                        {ORDER_STATUS_LABELS[s][lang]}
                      </button>
                    );
                  })}
                </div>
                {error && (
                  <p role="alert" className="adm-alert adm-alert-error">
                    {error}
                  </p>
                )}
              </div>
            )}
            {done && (
              <p role="status" className="adm-alert adm-alert-success mt-3">
                {done}
              </p>
            )}
          </section>

          <section className={panel}>
            <h2 className="ds-font-heading mb-4 text-base font-bold">{tt("history.title")}</h2>
            <OrderTimeline history={current.statusHistory} showNotes />
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? tt("dialog.title", { status: ORDER_STATUS_LABELS[pending][lang] }) : ""}
        confirmLabel={pending ? ORDER_STATUS_LABELS[pending][lang] : tt("dialog.confirm")}
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
          <p className="font-medium text-[var(--color-danger)]">{tt("dialog.irreversible")}</p>
        )}
      </ConfirmDialog>
    </div>
  );
}