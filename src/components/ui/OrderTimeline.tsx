"use client";

import { useLocale } from "next-intl";
import { ORDER_STATUS_LABELS, type OrderStatusValue } from "@/modules/orders/order-status";
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
  const lang = locale === "ar" ? "ar" : "en";
  const entries = [...history].reverse();

  if (entries.length === 0) return null;

  return (
    <ol className="relative ms-3 border-s border-zinc-300 dark:border-zinc-700">
      {entries.map((e, i) => (
        <li key={e.id} className="mb-5 ms-5 last:mb-0">
          <span
            className={`absolute -start-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${
              i === 0 ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
            }`}
          />
          <p className="text-sm font-medium">{ORDER_STATUS_LABELS[e.status][lang]}</p>
          <p className="text-xs text-zinc-500">{formatDateTime(e.createdAt, locale)}</p>
          {showNotes && e.note && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}