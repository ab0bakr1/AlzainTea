// src/components/checkout/CheckoutResult.tsx
// نتيجة الدفع بعد العودة من البوابة. الـ Webhook هو مصدر الحقيقة للحالة،
// لذلك نقرأ حالة الطلب من الخادم (polling خفيف) ولا نفترض النجاح من الوصول للصفحة.

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/useCart";
import { formatMoney } from "@/lib/order-format";
import { fetchMyOrder } from "@/services/orders.service";
import { fetchOrderStatus, readTrackingToken } from "@/services/order-result.service";
import type { PublicOrder } from "@/services/order-result.service";

const POLL_MS = 3000;
const MAX_POLLS = 10; // ~30 ثانية

type Phase = "paid" | "failed" | "pending";

function phaseOf(o: PublicOrder): Phase {
  if (o.status === "FAILED" || o.status === "CANCELLED" || o.paymentStatus === "FAILED") return "failed";
  if (o.paymentStatus === "PAID" || o.status !== "PENDING") return "paid";
  return "pending";
}

const btnPrimary = "px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium";
const btnSecondary = "px-6 py-2 rounded-xl border text-sm font-medium";

const noopSubscribe = () => () => {};

export default function CheckoutResult() {
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

  // ------------------------------------------------------------ تحميل
  if (resolving || (canFetch && query.isLoading)) {
    return (
      <Shell>
        <div className="space-y-4" aria-busy="true" role="status">
          <div className="h-8 w-2/3 mx-auto rounded bg-muted animate-pulse" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      </Shell>
    );
  }

  // ------------------------------------------- لا يمكن قراءة الطلب من هذا المتصفح
  if (!order) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">
          {hasStripeSession ? "شكراً لطلبك" : "نتحقق من نتيجة الدفع"}
        </h1>
        {ref && <p className="text-sm text-muted-foreground mb-3">رقم الطلب: {ref}</p>}
        <p className="text-muted-foreground mb-8">
          لا يمكننا عرض تفاصيل الطلب من هذا المتصفح. إن اكتمل الدفع فستصلك رسالة تأكيد على بريدك الإلكتروني.
        </p>
        <Actions>
          {isAuth && (
            <Link href="/account/orders" className={btnPrimary}>
              طلباتي
            </Link>
          )}
          <Link href="/products" className={isAuth ? btnSecondary : btnPrimary}>
            متابعة التسوق
          </Link>
        </Actions>
      </Shell>
    );
  }

  // ------------------------------------------------------------ فشل
  if (phase === "failed") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-red-600 mb-3">لم يكتمل الدفع</h1>
        {ref && <p className="text-sm text-muted-foreground mb-3">رقم الطلب: {ref}</p>}
        <p className="text-muted-foreground mb-8">
          سلتك محفوظة ويمكنك المحاولة مرة أخرى أو استخدام وسيلة دفع أخرى.
        </p>
        <Actions>
          <Link href="/checkout" className={btnPrimary}>
            إعادة المحاولة
          </Link>
          <Link href="/cart" className={btnSecondary}>
            العودة إلى السلة
          </Link>
        </Actions>
      </Shell>
    );
  }

  // ------------------------------------------------------------ بانتظار التأكيد
  if (phase === "pending") {
    return (
      <Shell>
        <div role="status" aria-live="polite">
          {!timedOut && (
            <span
              className="inline-block size-8 mb-4 rounded-full border-4 border-muted border-t-primary animate-spin"
              aria-hidden
            />
          )}
          <h1 className="text-2xl font-bold mb-3">
            {timedOut ? "ما زلنا نؤكد دفعتك" : "جارٍ تأكيد الدفع…"}
          </h1>
          {ref && <p className="text-sm text-muted-foreground mb-3">رقم الطلب: {ref}</p>}
          <p className="text-muted-foreground mb-8">
            {timedOut
              ? "قد يستغرق التأكيد دقائق. ستصلك رسالة على بريدك الإلكتروني فور اكتماله، ولا تحتاج لإعادة الدفع."
              : "لا تغلق الصفحة، يستغرق هذا ثوانيَ معدودة."}
          </p>
        </div>
        {timedOut && (
          <Actions>
            <button type="button" onClick={() => query.refetch()} className={btnPrimary}>
              تحديث الحالة
            </button>
            <Link href="/products" className={btnSecondary}>
              متابعة التسوق
            </Link>
          </Actions>
        )}
      </Shell>
    );
  }

  // ------------------------------------------------------------ نجاح
  const money = (v: string | number) => formatMoney(v, order.currency, "ar");
  const hasDiscount = Number(order.discount) > 0;

  return (
    <Shell align="start">
      <div className="text-center mb-8" role="status" aria-live="polite">
        <h1 className="text-2xl font-bold text-green-700 mb-2">تم استلام طلبك</h1>
        <p className="text-sm text-muted-foreground">رقم الطلب: {ref}</p>
        <p className="text-muted-foreground mt-3">سنرسل تأكيد الطلب إلى بريدك الإلكتروني.</p>
      </div>

      <section className="p-5 rounded-xl border bg-muted/30 space-y-4 mb-8" aria-label="ملخص الطلب">
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              {item.product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.product.images[0]} alt="" className="size-12 rounded-lg object-cover border" />
              ) : (
                <div className="size-12 rounded-lg bg-muted border" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.product.nameAr}
                  {item.variant ? ` — ${item.variant.name}` : ""}
                </p>
                <p className="text-muted-foreground">الكمية: {item.quantity}</p>
              </div>
              <span className="shrink-0">{money(Number(item.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 text-sm border-t pt-4">
          <Row label="المجموع الفرعي" value={money(order.subtotal)} />
          {hasDiscount && <Row label="الخصم" value={`−${money(order.discount)}`} className="text-green-700" />}
          <Row label="الشحن" value={money(order.shippingCost)} />
          <Row label="الضريبة" value={money(order.tax)} />
          <Row label="الإجمالي" value={money(order.total)} className="border-t pt-3 font-semibold text-base" />
        </dl>
      </section>

      <Actions>
        {isAuth && (
          <Link href={`/account/orders/${order.id}`} className={btnPrimary}>
            تتبع طلبي
          </Link>
        )}
        <Link href="/products" className={isAuth ? btnSecondary : btnPrimary}>
          متابعة التسوق
        </Link>
      </Actions>
    </Shell>
  );
}

function Shell({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div className={`container mx-auto px-4 py-16 max-w-2xl ${align === "center" ? "text-center" : ""}`}>
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-3">{children}</div>;
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <dt className={className ? "" : "text-muted-foreground"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}