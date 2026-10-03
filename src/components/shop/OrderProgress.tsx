"use client";

import { useLocale } from "next-intl";
import type { OrderStatusValue } from "@/modules/orders/order-status";
import { formatDateTime } from "@/lib/order-format";

/** المسار الطبيعي للطلب (الحالات النهائية الاستثنائية تُعرض كتنبيه وليس كشريط تقدم) */
const STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

const LABELS: Record<(typeof STEPS)[number], { ar: string; en: string }> = {
  PENDING: { ar: "تم الطلب", en: "Placed" },
  CONFIRMED: { ar: "تم التأكيد", en: "Confirmed" },
  PROCESSING: { ar: "قيد التجهيز", en: "Preparing" },
  SHIPPED: { ar: "تم الشحن", en: "Shipped" },
  DELIVERED: { ar: "تم التوصيل", en: "Delivered" },
};

interface Props {
  status: OrderStatusValue;
  history: { status: OrderStatusValue; createdAt: string }[];
}

export function OrderProgress({ status, history }: Props) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  if (current === -1) return null;

  const dateFor = (s: string) => history.findLast((h) => h.status === s)?.createdAt;

  return (
    <ol
      aria-label={lang === "ar" ? "مراحل الطلب" : "Order progress"}
      className="flex rounded-[var(--radius-lg)] border border-[var(--color-form)] bg-[var(--color-bg)] px-2 py-5 sm:px-4"
    >
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && step === "DELIVERED");
        const active = i === current && !done;
        const at = dateFor(step);
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute start-1/2 top-3.5 h-0.5 w-full ${
                  i < current ? "bg-[var(--color-primary)]" : "bg-[var(--color-form)]"
                }`}
              />
            )}
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs ${
                done
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : active
                    ? "border-[var(--color-primary)] bg-[var(--color-bg)] ring-4 ring-[var(--color-primary-200)]"
                    : "border-[var(--color-form)] bg-[var(--color-bg)]"
              }`}
            >
              {done && (
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {active && <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />}
            </span>
            <span
              className={`mt-2 px-0.5 text-[11px] leading-tight sm:text-sm ${
                done || active
                  ? "font-medium text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-disabled)]"
              }`}
            >
              {LABELS[step][lang]}
            </span>
            {at && (done || active) && (
              <span className="mt-0.5 hidden text-xs text-[var(--color-text-secondary)] sm:block">
                {formatDateTime(at, locale)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}