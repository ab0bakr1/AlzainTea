"use client";

import { useLocale, useTranslations } from "next-intl";
import type { OrderStatusValue } from "@/modules/orders/order-status";
import { formatDateTime } from "@/lib/order-format";

/** المسار الطبيعي للطلب (الحالات النهائية الاستثنائية تُعرض كتنبيه وليس كشريط تقدم) */
const STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

interface Props {
  status: OrderStatusValue;
  history: { status: OrderStatusValue; createdAt: string }[];
}

export function OrderProgress({ status, history }: Props) {
  const locale = useLocale();
  const t = useTranslations("orders.detail");
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  if (current === -1) return null;

  const dateFor = (s: string) => history.findLast((h) => h.status === s)?.createdAt;

  return (
    <ol
      aria-label={t("progressLabel")}
      className="flex rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] px-2 py-7 shadow-[var(--shadow-xs)] sm:px-6"
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
                className={`absolute start-1/2 top-4 h-0.5 w-full ${
                  i < current ? "bg-[var(--color-primary)]" : "bg-[var(--border-color)]"
                }`}
              />
            )}
            <span
              className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs transition-shadow ${
                done
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-gold)]"
                  : active
                    ? "border-[var(--color-primary)] bg-[var(--color-bg)] ring-4 ring-[var(--color-primary-300)]"
                    : "border-[var(--border-color-strong)] bg-[var(--color-bg)]"
              }`}
            >
              {done && (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {active && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
            </span>
            <span
              className={`mt-3 px-0.5 text-[11px] leading-tight sm:text-sm ${
                done || active
                  ? "font-semibold text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-disabled)]"
              }`}
            >
              {t(`steps.${step}`)}
            </span>
            {at && (done || active) && (
              <span className="mt-1 hidden text-xs text-[var(--color-text-secondary)] sm:block">
                {formatDateTime(at, locale)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}