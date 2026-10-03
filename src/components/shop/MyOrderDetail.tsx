"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
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

const COPY = {
  ar: {
    myOrders: "طلباتي",
    order: "طلب",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    print: "طباعة",
    loading: "جارٍ تحميل الطلب",
    notFound: "الطلب غير موجود",
    notFoundHint: "قد يكون الرابط غير صحيح أو أن الطلب يخص حساباً آخر.",
    loginNeeded: "سجّل الدخول لعرض هذا الطلب",
    login: "تسجيل الدخول",
    loadFailed: "تعذّر تحميل الطلب",
    retry: "إعادة المحاولة",
    backToOrders: "العودة إلى طلباتي",
    items: "المنتجات",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    shipping: "الشحن",
    free: "مجاني",
    tax: "الضريبة",
    vat: "الرقم الضريبي",
    total: "الإجمالي",
    tracking: "تتبع الطلب",
    address: "عنوان الشحن",
    payment: "الدفع",
    method: "الطريقة",
    notes: "ملاحظاتك",
    cancel: "إلغاء الطلب",
    cancelHint: "يمكنك الإلغاء قبل بدء التجهيز.",
    notCancellable: "لا يمكن إلغاء الطلب بعد بدء تجهيزه. للمساعدة تواصل مع الدعم.",
    paymentProcessing: "عملية الدفع قيد المعالجة، سيتاح الإلغاء بعد اكتمالها.",
    rate: "قيّم المنتج",
    rateTitle: "كيف كانت تجربتك؟",
    rateText: "تم توصيل طلبك. شاركنا رأيك في المنتجات ليستفيد منه غيرك.",
    couponLabel: "كوبون",
    notice: {
      pendingUnpaid: (until: string) =>
        `بانتظار إتمام الدفع. إذا لم يكتمل قبل ${until} سيُلغى الطلب تلقائياً وتُحرَّر الكمية.`,
      pendingPaying: "نتحقق من عملية الدفع. ستتحدّث الصفحة تلقائياً عند التأكيد.",
      confirmed: "استلمنا دفعك وسنبدأ بتجهيز طلبك قريباً.",
      delivered: "تم توصيل طلبك. نتمنى لك شاياً هنيئاً.",
      cancelledRefunded: "تم إلغاء الطلب واسترداد المبلغ إلى وسيلة الدفع الأصلية. قد يستغرق ظهوره في حسابك عدة أيام عمل.",
      cancelledRefunding: "تم الإلغاء، وعملية استرداد المبلغ قيد المعالجة.",
      cancelled: "تم إلغاء هذا الطلب.",
      failed: "لم يكتمل الدفع أو انتهت مهلته، لذلك لم يُنفَّذ الطلب. يمكنك إنشاء طلب جديد.",
      returned: "تم تسجيل إرجاع هذا الطلب.",
      refunded: "تم استرداد قيمة هذا الطلب إلى وسيلة الدفع الأصلية.",
    },
    errors: {
      generic: "حدث خطأ غير متوقع، حاول مرة أخرى.",
      ORDER_STATE_CONFLICT: "تغيّرت حالة الطلب للتو. حدّث الصفحة وحاول مجدداً.",
      REFUND_IN_PROGRESS: "عملية استرداد جارية لهذا الطلب. انتظر قليلاً.",
      REFUND_FAILED: "تعذّر تنفيذ الاسترداد لدى بوابة الدفع. لم يُلغَ الطلب، حاول لاحقاً أو تواصل مع الدعم.",
      ORDER_NOT_CANCELLABLE: "لا يمكن إلغاء الطلب بعد بدء تجهيزه. تواصل مع الدعم.",
      PAYMENT_IN_PROGRESS: "عملية الدفع قيد المعالجة. حاول بعد قليل.",
      TOO_MANY_REQUESTS: "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.",
    } as Record<string, string>,
    methods: { stripe: "Stripe", tap: "Tap Payments", moyasar: "Moyasar" } as Record<string, string>,
  },
  en: {
    myOrders: "My orders",
    order: "Order",
    copy: "Copy number",
    copied: "Copied",
    print: "Print",
    loading: "Loading order",
    notFound: "Order not found",
    notFoundHint: "The link may be wrong, or the order belongs to another account.",
    loginNeeded: "Sign in to view this order",
    login: "Sign in",
    loadFailed: "Couldn't load the order",
    retry: "Try again",
    backToOrders: "Back to my orders",
    items: "Items",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    free: "Free",
    tax: "Tax",
    vat: "VAT number",
    total: "Total",
    tracking: "Order tracking",
    address: "Shipping address",
    payment: "Payment",
    method: "Method",
    notes: "Your notes",
    cancel: "Cancel order",
    cancelHint: "You can cancel until preparation starts.",
    notCancellable: "This order can't be cancelled once preparation has started. Contact support for help.",
    paymentProcessing: "Payment is still processing. Cancelling will be available once it completes.",
    rate: "Rate product",
    rateTitle: "How was your experience?",
    rateText: "Your order has arrived. Share your review to help other shoppers.",
    couponLabel: "Coupon",
    notice: {
      pendingUnpaid: (until: string) =>
        `Waiting for payment. If it isn't completed by ${until}, the order is cancelled automatically and the items are released.`,
      pendingPaying: "We're verifying your payment. This page updates automatically once it's confirmed.",
      confirmed: "We've received your payment and will start preparing your order shortly.",
      delivered: "Your order has been delivered. Enjoy your tea.",
      cancelledRefunded: "The order was cancelled and the amount refunded to your original payment method. It may take a few business days to appear.",
      cancelledRefunding: "The order was cancelled and your refund is being processed.",
      cancelled: "This order was cancelled.",
      failed: "Payment wasn't completed or timed out, so the order wasn't placed. You can start a new order.",
      returned: "A return has been recorded for this order.",
      refunded: "This order has been refunded to your original payment method.",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      ORDER_STATE_CONFLICT: "The order status just changed. Refresh the page and try again.",
      REFUND_IN_PROGRESS: "A refund is already in progress for this order. Please wait a moment.",
      REFUND_FAILED: "The payment gateway couldn't process the refund. The order was not cancelled; try again later or contact support.",
      ORDER_NOT_CANCELLABLE: "This order can't be cancelled once preparation has started. Contact support.",
      PAYMENT_IN_PROGRESS: "Payment is still processing. Try again shortly.",
      TOO_MANY_REQUESTS: "Too many attempts. Wait a minute and try again.",
    } as Record<string, string>,
    methods: { stripe: "Stripe", tap: "Tap Payments", moyasar: "Moyasar" } as Record<string, string>,
  },
} as const;

type Tone = "info" | "warn" | "ok" | "bad" | "muted";
const TONE: Record<Tone, string> = {
  info: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  bad: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
  muted: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300",
};

const card = "rounded-[var(--radius-lg)] border border-[var(--color-form)] bg-[var(--color-bg)]";

function errorText(err: unknown, t: (typeof COPY)["ar"] | (typeof COPY)["en"]): string {
  const code = axios.isAxiosError(err) ? err.response?.data?.error?.code : undefined;
  if (code && t.errors[code]) return t.errors[code];
  // رسالة الخادم (عربية) كحل أخير لرموز غير معروفة
  return getApiErrorMessage(err, t.errors.generic);
}

export default function MyOrderDetail({ id }: { id: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const t = COPY[lang];

  const { data: order, isLoading, isError, error: loadError, refetch } = useMyOrder(id);
  const cancel = useCancelMyOrder(id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <OrderSkeleton label={t.loading} />;

  if (isError || !order) {
    const status = getApiErrorStatus(loadError);
    const title = status === 401 ? t.loginNeeded : status === 404 || !loadError ? t.notFound : t.loadFailed;
    return (
      <div className={`${card} mx-auto max-w-md space-y-3 p-8 text-center`}>
        <h1 className="text-lg font-semibold">{title}</h1>
        {(status === 404 || !loadError) && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t.notFoundHint}</p>
        )}
        <div className="flex justify-center gap-2 pt-2">
          {status === 401 ? (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/account/orders/${id}`)}`}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {t.login}
            </Link>
          ) : status !== 404 && loadError ? (
            <button
              onClick={() => refetch()}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {t.retry}
            </button>
          ) : null}
          <Link
            href="/account/orders"
            className="rounded-[var(--radius-md)] border border-[var(--color-form)] px-4 py-2 text-sm font-medium"
          >
            {t.backToOrders}
          </Link>
        </div>
      </div>
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
    <div className="space-y-6">
      {/* ----- الترويسة ----- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/account/orders" className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 print:hidden">
            {t.myOrders}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
            <span>{t.order}</span>
            <span dir="ltr" className="font-mono">#{shortId}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {formatDateTime(order.createdAt, locale)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            <PaymentStatusBadge status={order.paymentStatus} />
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex gap-2 text-sm print:hidden">
            <button
              onClick={copyId}
              className="rounded-[var(--radius-md)] border border-[var(--color-form)] px-3 py-1.5 hover:bg-[var(--color-bg-alt)]"
            >
              {copied ? t.copied : t.copy}
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-[var(--radius-md)] border border-[var(--color-form)] px-3 py-1.5 hover:bg-[var(--color-bg-alt)]"
            >
              {t.print}
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <p role="status" className={`rounded-[var(--radius-lg)] px-4 py-3 text-sm ${TONE[notice.tone]}`}>
          {notice.text}
        </p>
      )}

      <div className="print:hidden">
        <OrderProgress status={order.status} history={order.statusHistory} />
      </div>

      {order.status === "DELIVERED" && (
        <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-4 print:hidden`}>
          <div>
            <h2 className="font-medium">{t.rateTitle}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{t.rateText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.items.map((it) => (
              <Link
                key={it.id}
                href={`/products/${it.product.slug}#reviews`}
                className="rounded-[var(--radius-md)] border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-200)]"
              >
                {t.rate}: {lang === "ar" ? it.product.nameAr : it.product.nameEn}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ----- المنتجات والإجماليات ----- */}
        <section className={`${card} lg:col-span-2`} aria-labelledby="items-h">
          <h2 id="items-h" className="border-b border-[var(--color-form)] px-4 py-3 text-sm font-medium">
            {t.items} ({order.items.length})
          </h2>
          <ul className="divide-y divide-[var(--color-form)]">
            {order.items.map((it) => {
              const name = lang === "ar" ? it.product.nameAr : it.product.nameEn;
              return (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Link
                    href={`/products/${it.product.slug}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-form)]"
                  >
                    {it.product.images[0] && (
                      <Image src={it.product.images[0]} alt={name} fill sizes="64px" className="object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${it.product.slug}`} className="line-clamp-2 font-medium hover:underline">
                      {name}
                    </Link>
                    {it.variant && (
                      <p className="text-xs text-[var(--color-text-secondary)]">{it.variant.name}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {it.quantity} × {money(it.price)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{money(Number(it.price) * it.quantity)}</span>
                </li>
              );
            })}
          </ul>

          <dl className="space-y-1.5 border-t border-[var(--color-form)] p-4 text-sm">
            <Row label={t.subtotal} value={money(order.subtotal)} />
            {Number(order.discount) > 0 && (
              <Row
                label={order.coupon ? `${t.discount} (${t.couponLabel} ${order.coupon.code})` : t.discount}
                value={`− ${money(order.discount)}`}
                tone="text-emerald-700 dark:text-emerald-400"
              />
            )}
            <Row label={t.shipping} value={Number(order.shippingCost) === 0 ? t.free : money(order.shippingCost)} />
            <Row label={t.tax} value={money(order.tax)} />
            <div className="flex justify-between border-t border-[var(--color-form)] pt-2 text-base font-semibold">
              <dt>{t.total}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* ----- الشريط الجانبي ----- */}
        <aside className="space-y-6">
          <section className={`${card} p-4`}>
            <h2 className="mb-3 text-sm font-medium">{t.tracking}</h2>
            <OrderTimeline history={order.statusHistory} />
          </section>

          <section className={`${card} space-y-1 p-4 text-sm`}>
            <h2 className="mb-2 font-medium">{t.address}</h2>
            {order.shippingAddress ? (
              <address className="space-y-0.5 not-italic text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text-primary)]">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}، {country}
                  {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
                </p>
                <p dir="ltr" className="text-start">{order.shippingAddress.phone}</p>
              </address>
            ) : (
              <p className="text-[var(--color-text-secondary)]">{country}</p>
            )}
            {order.notes && (
              <p className="mt-3 border-t border-[var(--color-form)] pt-3 text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text-primary)]">{t.notes}: </span>
                {order.notes}
              </p>
            )}
          </section>

          <section className={`${card} space-y-2 p-4 text-sm`}>
            <h2 className="font-medium">{t.payment}</h2>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">{t.method}</span>
              <span>{t.methods[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <PaymentStatusBadge status={order.paymentStatus} />
              <span className="font-medium">{money(order.total)}</span>
            </div>
            {order.vatNumber && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">{t.vat}</span>
                <span dir="ltr">{order.vatNumber}</span>
              </div>
            )}
          </section>

          {statusAllowsCancel && (
            <section className={`${card} space-y-2 p-4 text-sm print:hidden`}>
              {canCancel ? (
                <>
                  <p className="text-[var(--color-text-secondary)]">{t.cancelHint}</p>
                  <button
                    onClick={openDialog}
                    className="w-full rounded-[var(--radius-md)] border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    {t.cancel}
                  </button>
                </>
              ) : (
                <p className="text-[var(--color-text-secondary)]">{t.paymentProcessing}</p>
              )}
            </section>
          )}
          {!statusAllowsCancel && order.status === "PROCESSING" && (
            <p className="px-1 text-sm text-[var(--color-text-secondary)] print:hidden">{t.notCancellable}</p>
          )}
        </aside>
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
    </div>
  );
}

// ---------------------------------------------------------------------------

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className={tone}>{value}</dd>
    </div>
  );
}

function OrderSkeleton({ label }: { label: string }) {
  const bar = "animate-pulse rounded-[var(--radius-md)] bg-[var(--color-form)]";
  return (
    <div role="status" aria-label={label} className="space-y-6">
      <div className={`${bar} h-12 w-64`} />
      <div className={`${bar} h-24 w-full`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${bar} h-72 lg:col-span-2`} />
        <div className={`${bar} h-72`} />
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

function buildNotice(
  o: OrderDetail,
  t: (typeof COPY)["ar"] | (typeof COPY)["en"],
  locale: string
): { tone: Tone; text: string } | null {
  switch (o.status) {
    case "PENDING": {
      if (o.paymentStatus === "PENDING") return { tone: "info", text: t.notice.pendingPaying };
      const until = new Date(new Date(o.createdAt).getTime() + PAYMENT_WINDOW_MIN * 60_000);
      return { tone: "warn", text: t.notice.pendingUnpaid(formatDateTime(until, locale)) };
    }
    case "CONFIRMED":
      return { tone: "info", text: t.notice.confirmed };
    case "DELIVERED":
      return { tone: "ok", text: t.notice.delivered };
    case "CANCELLED":
      if (o.paymentStatus === "REFUNDED") return { tone: "muted", text: t.notice.cancelledRefunded };
      if (o.paymentStatus === "PENDING") return { tone: "info", text: t.notice.cancelledRefunding };
      return { tone: "muted", text: t.notice.cancelled };
    case "FAILED":
      return { tone: "bad", text: t.notice.failed };
    case "RETURNED":
      return { tone: "warn", text: t.notice.returned };
    case "REFUNDED":
      return { tone: "muted", text: t.notice.refunded };
    default:
      return null;
  }
}