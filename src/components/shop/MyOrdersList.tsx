"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useCancelMyOrderFromList, useMyOrders } from "@/hooks/useOrders";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  type MyOrderListItem,
} from "@/services/orders.service";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { CUSTOMER_CANCELLABLE_STATUSES } from "@/modules/orders/order-status";
import type { MyOrderGroup } from "@/modules/orders/order.validators";
import { formatDateTime, formatMoney } from "@/lib/order-format";

/** مهلة الدفع قبل أن يُنهي الـ Cron الطلب (تطابق expireStalePendingOrders(60)) */
const PAYMENT_WINDOW_MINUTES = 60;

const GROUP_KEYS: MyOrderGroup[] = ["awaiting_payment", "in_progress", "completed", "closed"];

const TEXT = {
  ar: {
    tabs: {
      all: "الكل",
      awaiting_payment: "بانتظار الدفع",
      in_progress: "قيد التنفيذ",
      completed: "تم التسليم",
      closed: "ملغية ومغلقة",
    },
    filterLabel: "تصفية الطلبات",
    count: (n: number) => (n === 1 ? "طلب واحد" : `${n} طلبات`),
    loadError: "تعذّر تحميل طلباتك.",
    loginNeeded: "سجّل الدخول لعرض طلباتك.",
    login: "تسجيل الدخول",
    retry: "إعادة المحاولة",
    emptyAll: "لم تقم بأي طلب بعد.",
    emptyAllHint: "ابدأ بتصفح مجموعتنا من الشاي الفاخر.",
    emptyFiltered: "لا توجد طلبات في هذا التصنيف.",
    showAll: "عرض كل الطلبات",
    browse: "تصفح المنتجات",
    order: "طلب",
    items: (n: number) => (n === 1 ? "منتج واحد" : `${n} منتجات`),
    more: (n: number) => `+${n} أخرى`,
    total: "الإجمالي",
    details: "عرض التفاصيل",
    cancel: "إلغاء الطلب",
    cancelling: "جارٍ الإلغاء…",
    keep: "تراجع",
    confirmUnpaid: "هل تريد إلغاء هذا الطلب؟",
    confirmPaid: "سيتم إلغاء الطلب واسترداد المبلغ إلى وسيلة الدفع الأصلية. متابعة؟",
    confirmCancel: "تأكيد الإلغاء",
    payWindow: (m: number) => `تنتهي مهلة الدفع خلال ${m} دقيقة`,
    payExpired: "انتهت مهلة الدفع وسيُغلق الطلب تلقائياً قريباً",
    prev: "السابق",
    next: "التالي",
    page: (p: number, t: number) => `الصفحة ${p} من ${t}`,
  },
  en: {
    tabs: {
      all: "All",
      awaiting_payment: "Awaiting payment",
      in_progress: "In progress",
      completed: "Delivered",
      closed: "Cancelled & closed",
    },
    filterLabel: "Filter orders",
    count: (n: number) => (n === 1 ? "1 order" : `${n} orders`),
    loadError: "We couldn't load your orders.",
    loginNeeded: "Sign in to view your orders.",
    login: "Sign in",
    retry: "Try again",
    emptyAll: "You haven't placed any orders yet.",
    emptyAllHint: "Start by browsing our premium tea collection.",
    emptyFiltered: "No orders in this category.",
    showAll: "Show all orders",
    browse: "Browse products",
    order: "Order",
    items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    more: (n: number) => `+${n} more`,
    total: "Total",
    details: "View details",
    cancel: "Cancel order",
    cancelling: "Cancelling…",
    keep: "Keep order",
    confirmUnpaid: "Do you want to cancel this order?",
    confirmPaid: "The order will be cancelled and the amount refunded to your original payment method. Continue?",
    confirmCancel: "Confirm cancellation",
    payWindow: (m: number) => `Payment window closes in ${m} min`,
    payExpired: "Payment window has ended; the order will be closed automatically soon",
    prev: "Previous",
    next: "Next",
    page: (p: number, t: number) => `Page ${p} of ${t}`,
  },
} as const;

type Lang = keyof typeof TEXT;
type Copy = (typeof TEXT)[Lang];

function shortId(id: string) {
  return `#${id.slice(-8)}`;
}

// ---------------------------------------------------------------------------
// أجزاء مساعدة
// ---------------------------------------------------------------------------

function Thumbnails({ order, lang }: { order: MyOrderListItem; lang: Lang }) {
  const extra = order._count.items - order.items.length;
  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {order.items.map((it) => {
        const src = it.product.images[0];
        const name = lang === "ar" ? it.product.nameAr : it.product.nameEn;
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={it.id}
            src={src}
            alt={name}
            loading="lazy"
            className="size-12 rounded-lg border-2 border-white object-cover dark:border-zinc-900"
          />
        ) : (
          <span
            key={it.id}
            aria-hidden
            className="flex size-12 items-center justify-center rounded-lg border-2 border-white bg-zinc-100 text-xs text-zinc-400 dark:border-zinc-900 dark:bg-zinc-800"
          >
            {name.slice(0, 1)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="flex size-12 items-center justify-center rounded-lg border-2 border-white bg-zinc-100 text-xs font-medium text-zinc-600 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300">
          +{extra}
        </span>
      )}
    </div>
  );
}

function OrderCard({
  order,
  lang,
  locale,
  now,
  t,
}: {
  order: MyOrderListItem;
  lang: Lang;
  locale: string;
  now: number;
  t: Copy;
}) {
  const cancel = useCancelMyOrderFromList();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const first = order.items[0];
  const firstName = first ? (lang === "ar" ? first.product.nameAr : first.product.nameEn) : "";
  const restCount = order._count.items - 1;

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  const isPaid = order.paymentStatus === "PAID";

  const awaitingPayment = order.status === "PENDING" && order.paymentStatus === "UNPAID";
  const minutesLeft = awaitingPayment
    ? Math.ceil((new Date(order.createdAt).getTime() + PAYMENT_WINDOW_MINUTES * 60_000 - now) / 60_000)
    : null;

  function onConfirmCancel() {
    setError(null);
    cancel.mutate(
      { id: order.id },
      {
        onSuccess: () => setConfirming(false),
        onError: (e) => setError(getApiErrorMessage(e)),
      }
    );
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <div>
          <p className="text-sm font-medium">
            {t.order} <span className="font-mono">{shortId(order.id)}</span>
          </p>
          <p className="text-xs text-zinc-500">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Thumbnails order={order} lang={lang} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{firstName}</p>
            <p className="text-xs text-zinc-500">
              {restCount > 0 ? `${t.more(restCount)} · ` : ""}
              {t.items(order._count.items)}
            </p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs text-zinc-500">{t.total}</p>
          <p className="text-base font-semibold">{formatMoney(order.total, order.currency, locale)}</p>
        </div>
      </div>

      {minutesLeft !== null && (
        <p
          className={`mx-4 mb-3 rounded-lg px-3 py-2 text-xs ${
            minutesLeft > 0
              ? "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
              : "bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {minutesLeft > 0 ? t.payWindow(minutesLeft) : t.payExpired}
        </p>
      )}

      {confirming ? (
        <div className="space-y-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <p role="alert" className="text-sm">
            {isPaid ? t.confirmPaid : t.confirmUnpaid}
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onConfirmCancel}
              disabled={cancel.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancel.isPending ? t.cancelling : t.confirmCancel}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={cancel.isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              {t.keep}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
          {canCancel ? (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {t.cancel}
            </button>
          ) : (
            <span />
          )}
          <Link
            href={`/account/orders/${order.id}`}
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {t.details}
          </Link>
        </div>
      )}
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-4" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="animate-pulse rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="mb-4 flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
            <div className="h-5 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// المكون الرئيسي
// ---------------------------------------------------------------------------

export default function MyOrdersList() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = TEXT[lang];

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawGroup = searchParams.get("group");
  const group = GROUP_KEYS.includes(rawGroup as MyOrderGroup) ? (rawGroup as MyOrderGroup) : "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useMyOrders({ page, group });

  // لتحديث عدّاد مهلة الدفع دون إعادة جلب
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function update(next: { group?: MyOrderGroup | ""; page?: number }) {
    const sp = new URLSearchParams(searchParams.toString());
    const g = next.group !== undefined ? next.group : group;
    const p = next.page ?? 1;
    if (g) sp.set("group", g);
    else sp.delete("group");
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const tabs: { key: MyOrderGroup | ""; label: string }[] = [
    { key: "", label: t.tabs.all },
    ...GROUP_KEYS.map((k) => ({ key: k, label: t.tabs[k] })),
  ];

  const tabBar = (
    <div
      role="tablist"
      aria-label={t.filterLabel}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const active = tab.key === group;
        return (
          <button
            key={tab.key || "all"}
            role="tab"
            aria-selected={active}
            onClick={() => update({ group: tab.key, page: 1 })}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-zinc-500 ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // ---- أخطاء ----
  if (isError) {
    const unauthorized = getApiErrorStatus(error) === 401;
    return (
      <div role="alert" className="rounded-xl border border-red-200 p-8 text-center dark:border-red-500/30">
        <p className="mb-4 text-sm">{unauthorized ? t.loginNeeded : getApiErrorMessage(error, t.loadError)}</p>
        {unauthorized ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/account/orders")}`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t.login}
          </Link>
        ) : (
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            {t.retry}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {tabBar}

      {isLoading ? (
        <ListSkeleton />
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="mb-1 font-medium">{group ? t.emptyFiltered : t.emptyAll}</p>
          {!group && <p className="mb-4 text-sm text-zinc-500">{t.emptyAllHint}</p>}
          {group ? (
            <button
              onClick={() => update({ group: "", page: 1 })}
              className="mt-3 text-sm underline underline-offset-2"
            >
              {t.showAll}
            </button>
          ) : (
            <Link
              href="/products"
              className="inline-block rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.browse}
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500" aria-live="polite">
            {t.count(data.meta.total)}
          </p>

          <ul
            className={`space-y-4 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
            aria-busy={isPlaceholderData}
          >
            {data.items.map((o) => (
              <OrderCard key={o.id} order={o} lang={lang} locale={locale} now={now} t={t} />
            ))}
          </ul>

          {data.meta.totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="pagination">
              <button
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
              >
                {t.prev}
              </button>
              <span className="text-zinc-500">{t.page(data.meta.page, data.meta.totalPages)}</span>
              <button
                disabled={page >= data.meta.totalPages}
                onClick={() => update({ page: page + 1 })}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
              >
                {t.next}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}