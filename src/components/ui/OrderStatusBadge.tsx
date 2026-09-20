"use client";

import { useLocale } from "next-intl";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "@/modules/orders/order-status";

const ORDER_TONE: Record<OrderStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  CONFIRMED: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300",
  PROCESSING: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-300",
  SHIPPED: "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-300",
  DELIVERED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300",
  RETURNED: "bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-300",
  REFUNDED: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300",
  FAILED: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
};

const PAYMENT_TONE: Record<PaymentStatusValue, string> = {
  UNPAID: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300",
  PAID: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
  REFUNDED: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300",
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  return <span className={`${base} ${ORDER_TONE[status]}`}>{ORDER_STATUS_LABELS[status][locale]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatusValue }) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  return (
    <span className={`${base} ${PAYMENT_TONE[status]}`}>{PAYMENT_STATUS_LABELS[status][locale]}</span>
  );
}