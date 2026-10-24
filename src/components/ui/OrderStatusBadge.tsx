"use client";

import { useTranslations } from "next-intl";
import type { OrderStatusValue, PaymentStatusValue } from "@/modules/orders/order-status";

/*
  الشارات تعتمد على ds-badge (variants من globals.css) فتتبع الوضع الداكن
  تلقائياً عبر الـ tokens. النصوص من orders.detail.orderStatus / paymentStatus.
  - بدون variant = ذهبي (يستخدم للشحن: حالة "في الطريق")
  - NEUTRAL = رمادي دافئ للحالات المغلقة
*/
const NEUTRAL = "bg-[var(--color-form)] text-[var(--color-text-secondary)]";

const ORDER_TONE: Record<OrderStatusValue, string> = {
  PENDING: "ds-badge-warning",
  CONFIRMED: "ds-badge-info",
  PROCESSING: "ds-badge-info",
  SHIPPED: "",
  DELIVERED: "ds-badge-success",
  CANCELLED: NEUTRAL,
  RETURNED: "ds-badge-warning",
  REFUNDED: NEUTRAL,
  FAILED: "ds-badge-danger",
};

const PAYMENT_TONE: Record<PaymentStatusValue, string> = {
  UNPAID: NEUTRAL,
  PAID: "ds-badge-success",
  FAILED: "ds-badge-danger",
  REFUNDED: NEUTRAL,
  PENDING: "ds-badge-warning",
};

const base = "ds-badge whitespace-nowrap px-3.5 py-1 text-[13px]";

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  const t = useTranslations("orders.detail.orderStatus");
  return <span className={`${base} ${ORDER_TONE[status]}`}>{t(status)}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatusValue }) {
  const t = useTranslations("orders.detail.paymentStatus");
  return <span className={`${base} ${PAYMENT_TONE[status]}`}>{t(status)}</span>;
}