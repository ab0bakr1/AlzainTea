// src/components/checkout/OrderSummary.tsx
// ملخص الطلب الجانبي. المبالغ تقديرية وتُحسب نهائياً في الخادم عند إنشاء جلسة الدفع.
// التصميم: لوحة داكنة بحدود ذهبية خفيفة (نفس لغة بطاقة الدعوة في الصفحة الرئيسية).

"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CartItem } from "@/types/cart";

// ملاحظة: حقول عرض بند السلة (الاسم/الصورة) معزولة هنا في مكان واحد.
// عدّلها إن كانت أسماء حقول CartItem في مشروعك مختلفة.
function itemDisplay(item: CartItem, isAr: boolean, fallback: string) {
  const r = item as unknown as Record<string, unknown>;
  const name = (
    (isAr ? r.nameAr : (r.nameEn ?? r.nameAr)) ??
    r.name ??
    r.title ??
    fallback
  ) as string;
  const image = (r.image ?? (Array.isArray(r.images) ? r.images[0] : undefined)) as string | undefined;
  return { name, image };
}

type OrderSummaryProps = {
  items: CartItem[];
  formatUsd: (usd: number) => string;
  lines: {
    subtotal: string;
    discount: string | null;
    shipping: string;
    total: string;
  };
  currency: string;
};

export default function OrderSummary({ items, formatUsd, lines, currency }: OrderSummaryProps) {
  const t = useTranslations("checkout");
  const isAr = useLocale() === "ar";

  return (
    <aside
      className="co-summary rounded-[var(--radius-2xl)] p-6 md:p-7 lg:sticky lg:top-24"
      aria-label={t("orderSummary")}
    >
      <style>{`
        .co-summary{
          background-image:radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
          background-size:22px 22px,auto;
          border:1px solid rgba(201,164,92,.28);
          color:#f0e6d3;
          box-shadow:var(--shadow-lg);
        }
      `}</style>

      <h2 className="ds-font-heading text-2xl font-bold text-[#f0e6d3]">{t("orderSummary")}</h2>
      <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[#f0e6d3]/25" />

      <ul className="mt-6 max-h-72 space-y-4 overflow-y-auto pe-1">
        {items.map((item) => {
          const { name, image } = itemDisplay(item, isAr, t("summary.itemFallback"));
          return (
            <li key={`${item.productId}:${item.variantId ?? ""}`} className="flex items-center gap-4 text-sm">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  className="size-14 shrink-0 rounded-[var(--radius-lg)] border border-[#f0e6d3]/15 object-cover"
                />
              ) : (
                <div
                  className="size-14 shrink-0 rounded-[var(--radius-lg)] border border-[#f0e6d3]/15 bg-white/5"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#f0e6d3]">{name}</p>
                <p className="mt-0.5 text-[#c4b49e]">{t("summary.quantity", { count: item.quantity })}</p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatUsd(item.price * item.quantity)}</span>
            </li>
          );
        })}
      </ul>

      <dl className="mt-6 space-y-3 border-t border-[#f0e6d3]/12 pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[#c4b49e]">{t("summary.subtotal")}</dt>
          <dd className="tabular-nums">{lines.subtotal}</dd>
        </div>
        {lines.discount && (
          <div className="flex justify-between gap-4 text-[#b5d99c]">
            <dt>{t("summary.discount")}</dt>
            <dd className="tabular-nums">−{lines.discount}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-[#c4b49e]">{t("summary.shipping")}</dt>
          <dd className="tabular-nums">{lines.shipping}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-[#f0e6d3]/12 pt-4">
          <dt className="font-semibold">{t("summary.totalBeforeTax")}</dt>
          <dd className="ds-font-heading text-2xl font-bold tabular-nums text-[var(--brand-gold-light)]">
            {lines.total}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs leading-6 text-[#c4b49e]">{t("summary.vatNote", { currency })}</p>
    </aside>
  );
}