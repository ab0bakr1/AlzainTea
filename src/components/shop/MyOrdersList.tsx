"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
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

type Lang = "ar" | "en";

function shortId(id: string) {
  return `#${id.slice(-8)}`;
}

/* نصوص هذا المكوّن كلها في ar.json / en.json تحت المفتاح orders.list */

// ---------------------------------------------------------------------------
// أجزاء مساعدة
// ---------------------------------------------------------------------------

function Thumbnails({ order, lang }: { order: MyOrderListItem; lang: Lang }) {
  const extra = order._count.items - order.items.length;
  const thumb =
    "size-14 rounded-[var(--radius-lg)] border-2 border-[var(--color-bg)] bg-[var(--color-form)]";
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
            className={`${thumb} object-cover`}
          />
        ) : (
          <span
            key={it.id}
            aria-hidden
            className={`${thumb} flex items-center justify-center text-sm text-[var(--color-text-secondary)]`}
          >
            {name.slice(0, 1)}
          </span>
        );
      })}
      {extra > 0 && (
        <span
          className={`${thumb} flex items-center justify-center text-xs font-semibold tabular-nums text-[var(--color-accent-text)]`}
        >
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
}: {
  order: MyOrderListItem;
  lang: Lang;
  locale: string;
  now: number;
}) {
  const t = useTranslations("orders.list");
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

  const divider = "border-[var(--border-color)]";

  return (
    <li className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] shadow-[var(--shadow-xs)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-color-strong)] hover:shadow-[var(--shadow-md)]">
      {/* رأس البطاقة: رقم الطلب + التاريخ + الشارات */}
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b ${divider} bg-[var(--color-form)]/50 px-5 py-4`}
      >
        <div>
          <p className="ds-text-sm">
            <span className="ds-text-secondary">{t("order")}</span>{" "}
            <span className="ds-text-sm font-mono font-semibold tabular-nums">{shortId(order.id)}</span>
          </p>
          <p className="mt-1 text-xs tabular-nums text-[var(--color-text-secondary)]">
            {formatDateTime(order.createdAt, locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* المحتوى: الصور + اسم المنتج + الإجمالي */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <Thumbnails order={order} lang={lang} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{firstName}</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {restCount > 0 ? `${t("more", { count: restCount })} · ` : ""}
              {t("items", { count: order._count.items })}
            </p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs text-[var(--color-text-secondary)]">{t("total")}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--color-accent-text)]">
            {formatMoney(order.total, order.currency, locale)}
          </p>
        </div>
      </div>

      {minutesLeft !== null && (
        <p
          className={`mx-5 mb-4 rounded-[var(--radius-lg)] px-4 py-2.5 text-xs font-medium ${
            minutesLeft > 0
              ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
              : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
          }`}
        >
          {minutesLeft > 0 ? t("payWindow", { minutes: minutesLeft }) : t("payExpired")}
        </p>
      )}

      {confirming ? (
        <div className={`space-y-3 border-t ${divider} bg-[var(--color-danger-bg)]/40 px-5 py-4`}>
          <p role="alert" className="text-sm font-medium">
            {isPaid ? t("confirmPaid") : t("confirmUnpaid")}
          </p>
          {error && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onConfirmCancel}
              disabled={cancel.isPending}
              className="ds-btn min-h-10 bg-red-600 px-5 text-sm text-white hover:bg-red-700"
            >
              {cancel.isPending ? t("cancelling") : t("confirmCancel")}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={cancel.isPending}
              className="ds-btn ds-btn-outline min-h-10 px-5 text-sm"
            >
              {t("keep")}
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex flex-wrap items-center justify-between gap-2 border-t ${divider} px-5 py-3`}>
          {canCancel ? (
            <button
              onClick={() => setConfirming(true)}
              className="ds-btn min-h-10 px-4 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            >
              {t("cancel")}
            </button>
          ) : (
            <span />
          )}
          <Link href={`/account/orders/${order.id}`} className="ds-btn ds-btn-ghost min-h-10 px-4 text-sm">
            {t("details")}
            <ChevronRight aria-hidden size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      )}
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-5" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="animate-pulse overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)]"
        >
          <div className="flex justify-between border-b border-[var(--border-color)] bg-[var(--color-form)]/50 px-5 py-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--color-form)]" />
              <div className="h-3 w-24 rounded bg-[var(--color-form)]" />
            </div>
            <div className="h-5 w-24 rounded-full bg-[var(--color-form)]" />
          </div>
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="size-14 rounded-[var(--radius-lg)] bg-[var(--color-form)]" />
            <div className="h-4 w-40 rounded bg-[var(--color-form)]" />
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
  const t = useTranslations("orders.list");

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
    { key: "", label: t("tabs.all") },
    ...GROUP_KEYS.map((k) => ({ key: k, label: t(`tabs.${k}`) })),
  ];

  const tabBar = (
    <div
      role="tablist"
      aria-label={t("filterLabel")}
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
    >
      {tabs.map((tab) => {
        const active = tab.key === group;
        return (
          <button
            key={tab.key || "all"}
            role="tab"
            aria-selected={active}
            onClick={() => update({ group: tab.key, page: 1 })}
            className={`whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-[background-color,border-color,box-shadow] duration-200 ${
              active
                ? "border-transparent bg-[image:var(--gradient-gold)] text-[var(--color-on-primary)] shadow-[var(--shadow-gold)]"
                : "border-[var(--border-color-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-200)]"
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
      <div
        role="alert"
        className="rounded-[var(--radius-2xl)] border border-[var(--color-danger)]/40 bg-[var(--color-bg)] p-10 text-center"
      >
        <p className="mb-5 text-sm">{unauthorized ? t("loginNeeded") : getApiErrorMessage(error, t("loadError"))}</p>
        {unauthorized ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/account/orders")}`}
            className="ds-btn ds-btn-primary px-8"
          >
            {t("login")}
          </Link>
        ) : (
          <button onClick={() => refetch()} className="ds-btn ds-btn-outline px-8">
            {t("retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tabBar}

      {isLoading ? (
        <ListSkeleton />
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-[var(--radius-2xl)] border border-dashed border-[var(--border-color-strong)] bg-[var(--color-bg)] px-6 py-14 text-center">
          <span
            aria-hidden
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-form)] text-[var(--color-accent-text)]"
          >
            <Package size={28} />
          </span>
          <p className="text-lg font-bold">{group ? t("emptyFiltered") : t("emptyAll")}</p>
          {!group && <p className="mt-2 mb-6 text-sm text-[var(--color-text-secondary)]">{t("emptyAllHint")}</p>}
          {group ? (
            <button
              onClick={() => update({ group: "", page: 1 })}
              className="ds-btn ds-btn-ghost mt-4 px-6 text-sm"
            >
              {t("showAll")}
            </button>
          ) : (
            <Link href="/products" className="ds-btn ds-btn-primary px-8">
              {t("browse")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]" aria-live="polite">
            {t("count", { count: data.meta.total })}
          </p>

          <ul
            className={`space-y-5 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
            aria-busy={isPlaceholderData}
          >
            {data.items.map((o) => (
              <OrderCard key={o.id} order={o} lang={lang} locale={locale} now={now} />
            ))}
          </ul>

          {data.meta.totalPages > 1 && (
            <nav
              className="flex items-center justify-between gap-3 pt-2 text-sm"
              aria-label={t("paginationLabel")}
            >
              <button
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
                className="ds-btn ds-btn-outline min-h-10 px-4 text-sm"
              >
                <ChevronLeft aria-hidden size={16} className="rtl:rotate-180" />
                {t("prev")}
              </button>
              <span className="tabular-nums text-[var(--color-text-secondary)]">
                {t("page", { page: data.meta.page, total: data.meta.totalPages })}
              </span>
              <button
                disabled={page >= data.meta.totalPages}
                onClick={() => update({ page: page + 1 })}
                className="ds-btn ds-btn-outline min-h-10 px-4 text-sm"
              >
                {t("next")}
                <ChevronRight aria-hidden size={16} className="rtl:rotate-180" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}