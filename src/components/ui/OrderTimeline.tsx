"use client";

import { useLocale, useTranslations } from "next-intl";
import type { OrderStatusValue } from "@/modules/orders/order-status";
import { formatDateTime } from "@/lib/order-format";

interface Entry {
  id: string;
  status: OrderStatusValue;
  note: string | null;
  createdAt: string;
}

/** سجل تتبع الطلب (من الأحدث إلى الأقدم). showNotes=false للعميل لإخفاء وسوم الإدارة الداخلية. */
export function OrderTimeline({ history, showNotes = false }: { history: Entry[]; showNotes?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("orders.detail.orderStatus");
  const entries = [...history].reverse();

  if (entries.length === 0) return null;

  return (
    <ol className="relative ms-3 border-s border-[var(--border-color-strong)]">
      {entries.map((e, i) => (
        <li key={e.id} className="mb-6 ms-6 last:mb-0">
          <span
            aria-hidden
            className={`absolute -start-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-bg)] ${
              i === 0
                ? "bg-[var(--color-primary)] shadow-[var(--shadow-gold)]"
                : "bg-[var(--border-color-strong)]"
            }`}
          />
          <p className={`text-sm ${i === 0 ? "font-bold" : "font-medium"}`}>{t(e.status)}</p>
          <p className="mt-0.5 text-xs tabular-nums text-[var(--color-text-secondary)]">
            {formatDateTime(e.createdAt, locale)}
          </p>
          {showNotes && e.note && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{e.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}