// src/components/checkout/CheckoutResult.tsx
// نتيجة الدفع بعد العودة من البوابة. الـ Webhook هو مصدر الحقيقة للحالة،
// لذلك نقرأ حالة الطلب من الخادم (polling خفيف) ولا نفترض النجاح من الوصول للصفحة.
// التصميم: هيرو داكن بميدالية الحالة (ResultHero) + بطاقة ملخص الطلب، بنفس لغة الصفحة الرئيسية.
// النصوص كلها من checkout.* في ar.json / en.json.

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatMoney } from "@/lib/order-format";
import { fetchMyOrder } from "@/services/orders.service";
import { fetchOrderStatus, readTrackingToken } from "@/services/order-result.service";
import type { PublicOrder } from "@/services/order-result.service";
import type { OrderStatusValue, PaymentStatusValue } from "@/modules/orders/order-status";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/OrderStatusBadge";
import { ResultHero, ResultHeroSkeleton, ResultShell, resultBtn, resultCard } from "./ResultHero";

const POLL_MS = 3000;
const MAX_POLLS = 10; // ~30 ثانية

type Phase = "paid" | "failed" | "pending";

function phaseOf(o: PublicOrder): Phase {
  if (o.status === "FAILED" || o.status === "CANCELLED" || o.paymentStatus === "FAILED") return "failed";
  if (o.paymentStatus === "PAID" || o.status !== "PENDING") return "paid";
  return "pending";
}

const noopSubscribe = () => () => {};

export default function CheckoutResult() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const isAr = locale === "ar";

  const params = useSearchParams();
  const orderId = params.get("orderId");
  const hasStripeSession = !!params.get("session_id");
  const { status: authStatus } = useSession();
  const isAuth = authStatus === "authenticated";
  const { clearCart } = useCart();

  // undefined = لم نقرأ التخزين بعد (SSR / أول رسم)
  const token = useSyncExternalStore<string | null | undefined>(
    noopSubscribe,
    () => (orderId ? readTrackingToken(orderId) : null),
    () => undefined
  );

  const resolving = token === undefined || (!token && authStatus === "loading");
  const canFetch = !!orderId && !resolving && (!!token || isAuth);

  // عدّاد المحاولات: يُزاد عند كل جلب، ويحدد توقف الـ polling وظهور حالة "ما زلنا نؤكد"
  const [polls, setPolls] = useState(0);

  const query = useQuery<PublicOrder>({
    queryKey: ["checkout-result", orderId, token ? "token" : "session"],
    queryFn: () => {
      setPolls((n) => n + 1);
      return token ? fetchOrderStatus(orderId!, token) : fetchMyOrder(orderId!);
    },
    enabled: canFetch,
    retry: false,
    refetchInterval: (q) => {
      if (q.state.status === "error") return false;
      const d = q.state.data;
      if (d && phaseOf(d) !== "pending") return false;
      return polls >= MAX_POLLS ? false : POLL_MS;
    },
  });

  const order = query.data;
  const phase = order ? phaseOf(order) : null;
  const timedOut = phase === "pending" && polls >= MAX_POLLS && !query.isFetching;
  // تفريغ السلة فقط عند التأكد من الدفع، أو عند وجود session_id (Stripe لا يعيد لهذا الرابط إلا بعد الدفع).
  // بوابات الخليج تعيد العميل للرابط نفسه حتى عند الفشل، فلا نفرّغ السلة بمجرد الوصول.
  const cleared = useRef(false);
  const shouldClear = phase === "paid" || (hasStripeSession && !!orderId);
  useEffect(() => {
    if (shouldClear && !cleared.current) {
      cleared.current = true;
      clearCart();
    }
  }, [shouldClear, clearCart]);

  const ref = orderId ? `#${orderId.slice(-8).toUpperCase()}` : null;
  const refLabel = t("success.orderNumber");

  // ------------------------------------------------------------ تحميل
  if (resolving || (canFetch && query.isLoading)) {
    return (
      <ResultShell>
        <ResultHeroSkeleton label={t("result.loading")} />
      </ResultShell>
    );
  }

  // ------------------------------------------- لا يمكن قراءة الطلب من هذا المتصفح
  if (!order) {
    return (
      <ResultShell>
        <ResultHero
          tone="info"
          title={hasStripeSession ? t("result.unknown.thanksTitle") : t("result.unknown.checkingTitle")}
          refLabel={refLabel}
          refValue={ref}
          description={t("result.unknown.text")}
        >
          {isAuth && (
            <Link href="/account/orders" className={resultBtn.primary}>
              {t("result.myOrders")}
            </Link>
          )}
          <Link href="/products" className={isAuth ? resultBtn.secondary : resultBtn.primary}>
            {t("success.continueShopping")}
          </Link>
        </ResultHero>
      </ResultShell>
    );
  }

  // ------------------------------------------------------------ فشل
  if (phase === "failed") {
    return (
      <ResultShell>
        <ResultHero
          tone="failed"
          title={t("cancel.title")}
          refLabel={refLabel}
          refValue={ref}
          description={t("result.failedText")}
        >
          <Link href="/checkout" className={resultBtn.primary}>
            {t("cancel.tryAgain")}
          </Link>
          <Link href="/cart" className={resultBtn.secondary}>
            {t("cancel.backToCart")}
          </Link>
          <Link href="/contact" className={resultBtn.ghost}>
            {t("result.contactUs")}
          </Link>
        </ResultHero>
      </ResultShell>
    );
  }

  // ------------------------------------------------------------ بانتظار التأكيد
  if (phase === "pending") {
    return (
      <ResultShell>
        <ResultHero
          live
          tone="pending"
          title={timedOut ? t("result.pending.timedOutTitle") : t("result.pending.title")}
          refLabel={refLabel}
          refValue={ref}
          description={timedOut ? t("result.pending.timedOutText") : t("result.pending.text")}
        >
          {timedOut && (
            <>
              <button type="button" onClick={() => query.refetch()} className={resultBtn.primary}>
                {t("result.pending.refresh")}
              </button>
              <Link href="/products" className={resultBtn.secondary}>
                {t("success.continueShopping")}
              </Link>
            </>
          )}
        </ResultHero>
      </ResultShell>
    );
  }

  // ------------------------------------------------------------ نجاح
  const money = (v: string | number) => formatMoney(v, order.currency, locale);
  const hasDiscount = Number(order.discount) > 0;

  return (
    <ResultShell>
      <ResultHero
        live
        tone="success"
        title={t("success.title")}
        refLabel={refLabel}
        refValue={ref}
        description={t("success.subtitle")}
        note={
          <span className="inline-flex items-center gap-2">
            <Mail size={16} aria-hidden />
            {t("result.emailNote")}
          </span>
        }
      >
        {isAuth && (
          <Link href={`/account/orders/${order.id}`} className={resultBtn.primary}>
            {t("success.trackOrder")}
          </Link>
        )}
        <Link href="/products" className={isAuth ? resultBtn.secondary : resultBtn.primary}>
          {t("success.continueShopping")}
        </Link>
      </ResultHero>

      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20" aria-labelledby="result-summary">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="result-summary" className="text-3xl font-bold md:text-4xl">
              {t("orderSummary")}
            </h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <PaymentStatusBadge status={order.paymentStatus as PaymentStatusValue} />
            <OrderStatusBadge status={order.status as OrderStatusValue} />
          </div>
        </div>

        <div className={resultCard}>
          <ul className="divide-y divide-[var(--border-color)]">
            {order.items.map((item) => {
              const product = item.product as { nameAr: string; nameEn?: string };
              const name = isAr ? product.nameAr : (product.nameEn ?? product.nameAr);
              return (
                <li key={item.id} className="flex items-center gap-4 p-5">
                  {item.product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.images[0]}
                      alt=""
                      className="size-16 shrink-0 rounded-[var(--radius-lg)] border border-[var(--border-color)] object-cover"
                    />
                  ) : (
                    <div
                      className="size-16 shrink-0 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--color-form)]"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {name}
                      {item.variant ? ` — ${item.variant.name}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {t("summary.quantity", { count: item.quantity })}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{money(Number(item.price) * item.quantity)}</span>
                </li>
              );
            })}
          </ul>

          <dl className="space-y-3 border-t border-[var(--border-color)] bg-[var(--color-form)]/50 p-6 text-sm">
            <Row label={t("summary.subtotal")} value={money(order.subtotal)} />
            {hasDiscount && (
              <Row label={t("summary.discount")} value={`−${money(order.discount)}`} tone="ok" />
            )}
            <Row label={t("summary.shipping")} value={money(order.shippingCost)} />
            <Row label={t("result.tax")} value={money(order.tax)} />
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border-color)] pt-4">
              <dt className="text-base font-bold">{t("result.total")}</dt>
              <dd className="ds-price text-2xl">{money(order.total)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </ResultShell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className={`tabular-nums ${tone === "ok" ? "text-[var(--color-success)]" : ""}`}>{value}</dd>
    </div>
  );
}