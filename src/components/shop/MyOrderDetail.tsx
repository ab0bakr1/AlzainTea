"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, Copy, CreditCard, MapPin, Package, Printer, Receipt, Route, Star } from "lucide-react";
import { useCancelMyOrder, useMyOrder } from "@/hooks/useOrders";
import { getApiErrorMessage, getApiErrorStatus, type OrderDetail } from "@/services/orders.service";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { OrderTimeline } from "@/components/ui/OrderTimeline";
import { OrderProgress } from "@/components/shop/OrderProgress";
import { CancelOrderDialog } from "@/components/shop/CancelOrderDialog";
import { CUSTOMER_CANCELLABLE_STATUSES } from "@/modules/orders/order-status";
import { formatDateTime, formatMoney } from "@/lib/order-format";

/** مهلة الدفع قبل أن يلغي الـ Cron الطلب (يطابق expireStalePendingOrders(60)) */
const PAYMENT_WINDOW_MIN = 60;

type Translator = ReturnType<typeof useTranslations>;

type Tone = "info" | "warn" | "ok" | "bad" | "muted";
const TONE: Record<Tone, string> = {
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  warn: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  ok: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  bad: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  muted: "bg-[var(--color-form)] text-[var(--color-text-secondary)]",
};

/* نفس بطاقات الصفحة الرئيسية: radius-2xl + حد رملي + ظل عند التفاعل */
const card =
  "rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--color-bg)] shadow-[var(--shadow-xs)]";

/* نفس متغيرات الصفحة الرئيسية (.home) + ترويسة داكنة دائماً في الوضعين */
const STYLE = `
  .od{
    --h-bg:var(--color-bg-alt);
    --h-surface:var(--color-form);
    --h-ink:var(--color-text-primary);
    --h-muted:var(--color-text-secondary);
    --h-accent:var(--color-accent-text);
    --h-r-lg:var(--radius-2xl);
    background:var(--h-bg);color:var(--h-ink);
  }
  .od .od-hero{
    --h-ink:#f0e6d3;--h-muted:#c4b49e;--h-accent:#d8c9a8;
    background-image:radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
    background-size:22px 22px,auto;
    color:var(--h-ink);
  }
  @media print{
    .od .od-hero{background:none!important;color:#000!important}
    .od .od-hero *{color:#000!important}
  }
`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="od min-h-[70vh]">
      <style>{STYLE}</style>
      {children}
    </div>
  );
}

function errorText(err: unknown, t: Translator): string {
  const code = axios.isAxiosError(err) ? err.response?.data?.error?.code : undefined;
  if (code && t.has(`errors.${code}`)) return t(`errors.${code}`);
  // رسالة الخادم (عربية) كحل أخير لرموز غير معروفة
  return getApiErrorMessage(err, t("errors.generic"));
}

export default function MyOrderDetail({ id }: { id: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const t = useTranslations("orders.detail");

  const { data: order, isLoading, isError, error: loadError, refetch } = useMyOrder(id);
  const cancel = useCancelMyOrder(id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Shell>
        <OrderSkeleton label={t("loading")} />
      </Shell>
    );
  }

  if (isError || !order) {
    const status = getApiErrorStatus(loadError);
    const title =
      status === 401 ? t("loginNeeded") : status === 404 || !loadError ? t("notFound") : t("loadFailed");
    return (
      <Shell>
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <div className={`${card} mx-auto max-w-md space-y-4 p-8 text-center md:p-10`}>
            <span
              aria-hidden
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--h-surface)] text-[var(--h-accent)]"
            >
              <Package size={26} />
            </span>
            <h1 className="ds-font-heading text-2xl font-bold">{title}</h1>
            {(status === 404 || !loadError) && (
              <p className="text-sm leading-7 text-[var(--h-muted)]">{t("notFoundHint")}</p>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-3">
              {status === 401 ? (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/account/orders/${id}`)}`}
                  className="ds-btn ds-btn-primary px-7"
                >
                  {t("login")}
                </Link>
              ) : status !== 404 && loadError ? (
                <button onClick={() => refetch()} className="ds-btn ds-btn-primary px-7">
                  {t("retry")}
                </button>
              ) : null}
              <Link href="/account/orders" className="ds-btn ds-btn-outline px-7">
                {t("backToOrders")}
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const money = (v: string | number) => formatMoney(v, order.currency, locale);
  const paid = order.paymentStatus === "PAID";
  const shortId = order.id.slice(-8).toUpperCase();
  const statusAllowsCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  // أثناء استرداد/دفع قيد المعالجة يرفض الخادم الإلغاء (PAYMENT_IN_PROGRESS)
  const canCancel = statusAllowsCancel && order.paymentStatus !== "PENDING";
  const notice = buildNotice(order, t, locale);

  function openDialog() {
    setCancelError(null);
    setReason("");
    setDialogOpen(true);
  }

  function confirmCancel() {
    setCancelError(null);
    cancel.mutate(reason.trim() || undefined, {
      onSuccess: () => setDialogOpen(false),
      onError: (e) => setCancelError(errorText(e, t)),
    });
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(shortId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الحافظة غير متاحة — لا إجراء */
    }
  }

  const country = regionName(order.shippingAddress?.country ?? order.country, locale);

  return (
    <Shell>
      {/* ----- الترويسة الداكنة ----- */}
      <header className="od-hero relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-8 md:px-8 md:pb-14 md:pt-12">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium text-[var(--h-muted)] transition-colors hover:border-[#f0e6d3]/30 hover:text-[#f0e6d3] print:hidden"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden />
            {t("myOrders")}
          </Link>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="ds-font-heading flex flex-wrap items-baseline gap-x-4 text-4xl font-extrabold leading-[1.15] text-[#f0e6d3] md:text-6xl">
                <span>{t("order")}</span>
                <span dir="ltr" className="tabular-nums">#{shortId}</span>
              </h1>
              <p className="mt-4 text-base tabular-nums text-[var(--h-muted)]">
                {formatDateTime(order.createdAt, locale)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PaymentStatusBadge status={order.paymentStatus} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                onClick={copyId}
                className="ds-btn border border-[#f0e6d3]/30 px-6 text-sm text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5"
              >
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                {copied ? t("copied") : t("copy")}
              </button>
              <button
                onClick={() => window.print()}
                className="ds-btn border border-[#f0e6d3]/30 px-6 text-sm text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5"
              >
                <Printer size={16} aria-hidden />
                {t("print")}
              </button>
            </div>
          </div>
        </div>
        <hr className="ds-gold-rule opacity-60" />
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10 md:px-8 md:py-14">
        {notice && (
          <p
            role="status"
            className={`rounded-[var(--h-r-lg)] border-s-4 border-current px-5 py-4 text-sm leading-7 ${TONE[notice.tone]}`}
          >
            {notice.text}
          </p>
        )}

        <div className="print:hidden">
          <OrderProgress status={order.status} history={order.statusHistory} />
        </div>

        {order.status === "DELIVERED" && (
          <section className={`${card} flex flex-wrap items-center justify-between gap-5 p-6 print:hidden`}>
            <div className="flex items-start gap-4">
              <IconBubble icon={Star} />
              <div>
                <h2 className="ds-font-heading text-xl font-bold">{t("rateTitle")}</h2>
                <p className="mt-1 text-sm leading-7 text-[var(--h-muted)]">{t("rateText")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.items.map((it) => (
                <Link
                  key={it.id}
                  href={`/products/${it.product.slug}#reviews`}
                  className="ds-btn ds-btn-outline px-5 text-sm"
                >
                  {t("rateProduct", { name: lang === "ar" ? it.product.nameAr : it.product.nameEn })}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {/* ----- المنتجات + التتبع ----- */}
          <div className="space-y-6 lg:col-span-2 lg:space-y-8">
            <section className={card} aria-labelledby="items-h">
              <CardTitle id="items-h" icon={Package} className="border-b border-[var(--border-color)] px-6 py-5">
                {t("items", { count: order.items.length })}
              </CardTitle>
              <ul className="divide-y divide-[var(--border-color)]">
                {order.items.map((it) => {
                  const name = lang === "ar" ? it.product.nameAr : it.product.nameEn;
                  return (
                    <li key={it.id} className="group flex items-center gap-4 px-6 py-5">
                      <Link
                        href={`/products/${it.product.slug}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--h-surface)] md:h-24 md:w-24"
                      >
                        {it.product.images[0] && (
                          <Image
                            src={it.product.images[0]}
                            alt={name}
                            fill
                            sizes="96px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                          />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${it.product.slug}`}
                          className="line-clamp-2 text-base font-semibold leading-snug hover:underline"
                        >
                          {name}
                        </Link>
                        {it.variant && <p className="mt-1 text-sm text-[var(--h-muted)]">{it.variant.name}</p>}
                        <p className="mt-1 text-sm tabular-nums text-[var(--h-muted)]">
                          {it.quantity} × {money(it.price)}
                        </p>
                      </div>
                      <span className="ds-price shrink-0 text-base">{money(Number(it.price) * it.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className={`${card} p-6`}>
              <CardTitle icon={Route} className="mb-6">
                {t("tracking")}
              </CardTitle>
              <OrderTimeline history={order.statusHistory} />
            </section>
          </div>

          {/* ----- الشريط الجانبي ----- */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <section className={`${card} p-6`}>
              <CardTitle icon={Receipt} className="mb-5">
                {t("summary")}
              </CardTitle>
              <dl className="space-y-3 text-sm">
                <Row label={t("subtotal")} value={money(order.subtotal)} />
                {Number(order.discount) > 0 && (
                  <Row
                    label={order.coupon ? t("discountWithCoupon", { code: order.coupon.code }) : t("discount")}
                    value={`− ${money(order.discount)}`}
                    tone="text-[var(--color-success)]"
                  />
                )}
                <Row
                  label={t("shipping")}
                  value={Number(order.shippingCost) === 0 ? t("free") : money(order.shippingCost)}
                />
                <Row label={t("tax")} value={money(order.tax)} />
                <div className="flex items-baseline justify-between border-t border-[var(--border-color)] pt-4">
                  <dt className="text-base font-bold">{t("total")}</dt>
                  <dd className="ds-price text-2xl">{money(order.total)}</dd>
                </div>
              </dl>
            </section>

            <section className={`${card} p-6 text-sm`}>
              <CardTitle icon={MapPin} className="mb-4">
                {t("address")}
              </CardTitle>
              {order.shippingAddress ? (
                <address className="space-y-1 leading-7 not-italic text-[var(--h-muted)]">
                  <p className="font-semibold text-[var(--h-ink)]">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}
                    {t("addressSeparator")}
                    {country}
                    {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
                  </p>
                  <p dir="ltr" className="text-start tabular-nums">
                    {order.shippingAddress.phone}
                  </p>
                </address>
              ) : (
                <p className="text-[var(--h-muted)]">{country}</p>
              )}
              {order.notes && (
                <p className="mt-4 border-t border-[var(--border-color)] pt-4 leading-7 text-[var(--h-muted)]">
                  <span className="font-semibold text-[var(--h-ink)]">{t("notes")}: </span>
                  {order.notes}
                </p>
              )}
            </section>

            <section className={`${card} space-y-3 p-6 text-sm`}>
              <CardTitle icon={CreditCard} className="mb-2">
                {t("payment")}
              </CardTitle>
              <div className="flex items-center justify-between">
                <span className="text-[var(--h-muted)]">{t("method")}</span>
                <span className="font-medium">{t.has(`methods.${order.paymentMethod}`) ? t(`methods.${order.paymentMethod}`) : order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <PaymentStatusBadge status={order.paymentStatus} />
                <span className="ds-price">{money(order.total)}</span>
              </div>
              {order.vatNumber && (
                <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                  <span className="text-[var(--h-muted)]">{t("vat")}</span>
                  <span dir="ltr" className="tabular-nums">{order.vatNumber}</span>
                </div>
              )}
            </section>

            {statusAllowsCancel && (
              <section className={`${card} space-y-4 p-6 text-sm print:hidden`}>
                {canCancel ? (
                  <>
                    <p className="leading-7 text-[var(--h-muted)]">{t("cancelHint")}</p>
                    <button
                      onClick={openDialog}
                      className="ds-btn w-full border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                    >
                      {t("cancel")}
                    </button>
                  </>
                ) : (
                  <p className="leading-7 text-[var(--h-muted)]">{t("paymentProcessing")}</p>
                )}
              </section>
            )}
            {!statusAllowsCancel && order.status === "PROCESSING" && (
              <p className="px-1 text-sm leading-7 text-[var(--h-muted)] print:hidden">{t("notCancellable")}</p>
            )}
          </aside>
        </div>
      </div>

      <CancelOrderDialog
        open={dialogOpen}
        paid={paid}
        pending={cancel.isPending}
        error={cancelError}
        reason={reason}
        onReasonChange={setReason}
        onClose={() => setDialogOpen(false)}
        onConfirm={confirmCancel}
        lang={lang}
      />
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function IconBubble({ icon: Icon }: { icon: React.ComponentType<{ size?: number }> }) {
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--h-surface)] text-[var(--h-accent)]"
    >
      <Icon size={20} />
    </span>
  );
}

/** عنوان قسم: أيقونة داخل دائرة + خط ذهبي قصير كما في أقسام الصفحة الرئيسية */
function CardTitle({
  id,
  icon,
  className = "",
  children,
}: {
  id?: string;
  icon: React.ComponentType<{ size?: number }>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconBubble icon={icon} />
      <div>
        <h2 id={id} className="ds-font-heading text-xl font-bold leading-tight">
          {children}
        </h2>
        <span aria-hidden className="mt-1.5 block h-[2px] w-10 rounded-full bg-[var(--border-color-strong)]" />
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--h-muted)]">{label}</dt>
      <dd className={`tabular-nums ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

function OrderSkeleton({ label }: { label: string }) {
  const bar = "animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-form)]";
  return (
    <div role="status" aria-label={label}>
      <div className="od-hero">
        <div className="mx-auto max-w-7xl space-y-4 px-5 py-12 md:px-8 md:py-16">
          <div className="h-12 w-72 animate-pulse rounded-[var(--radius-xl)] bg-white/10" />
          <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10 md:px-8 md:py-14">
        <div className={`${bar} h-28 w-full`} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className={`${bar} h-80 lg:col-span-2`} />
          <div className={`${bar} h-80`} />
        </div>
      </div>
    </div>
  );
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function buildNotice(o: OrderDetail, t: Translator, locale: string): { tone: Tone; text: string } | null {
  switch (o.status) {
    case "PENDING": {
      if (o.paymentStatus === "PENDING") return { tone: "info", text: t("notice.pendingPaying") };
      const until = new Date(new Date(o.createdAt).getTime() + PAYMENT_WINDOW_MIN * 60_000);
      return { tone: "warn", text: t("notice.pendingUnpaid", { until: formatDateTime(until, locale) }) };
    }
    case "CONFIRMED":
      return { tone: "info", text: t("notice.confirmed") };
    case "DELIVERED":
      return { tone: "ok", text: t("notice.delivered") };
    case "CANCELLED":
      if (o.paymentStatus === "REFUNDED") return { tone: "muted", text: t("notice.cancelledRefunded") };
      if (o.paymentStatus === "PENDING") return { tone: "info", text: t("notice.cancelledRefunding") };
      return { tone: "muted", text: t("notice.cancelled") };
    case "FAILED":
      return { tone: "bad", text: t("notice.failed") };
    case "RETURNED":
      return { tone: "warn", text: t("notice.returned") };
    case "REFUNDED":
      return { tone: "muted", text: t("notice.refunded") };
    default:
      return null;
  }
}