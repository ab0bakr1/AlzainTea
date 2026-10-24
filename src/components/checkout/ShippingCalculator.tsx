// src/components/checkout/ShippingCalculator.tsx
// تفاصيل الشحن حسب الدولة. عرضية بالكامل: القيم تأتي من /api/shipping/calculate عبر CheckoutView.
// (useCountry ليس مخزناً مشتركاً — كل استدعاء له حالة مستقلة — لذلك لا نستدعيه هنا.)

"use client";

import { useTranslations } from "next-intl";
import { Info, Truck } from "lucide-react";

type ShippingCalculatorProps = {
  countryName?: string;
  costLabel: string;
  estimatedDays?: string | null;
  isLoading?: boolean;
  /** true عندما تعذّر جلب السعر الدقيق ونعرض سعراً تقديرياً */
  isEstimate?: boolean;
  onRetry?: () => void;
};

export default function ShippingCalculator({
  countryName,
  costLabel,
  estimatedDays,
  isLoading,
  isEstimate,
  onRetry,
}: ShippingCalculatorProps) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");

  function daysLabel(days?: string | null) {
    if (!days) return "—";
    return /^\d+$/.test(days) ? t("shippingBox.businessDays", { days }) : days;
  }

  return (
    <section
      className="rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--color-bg-alt)] p-5"
      aria-busy={isLoading}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-[var(--color-form)] text-[var(--color-accent-text)]"
        >
          <Truck size={20} />
        </span>
        <h3 className="text-lg font-bold">{t("shippingBox.title")}</h3>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-text-secondary)]">{t("country")}</dt>
          <dd className="font-medium">{countryName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-text-secondary)]">{t("shippingBox.cost")}</dt>
          <dd className="font-semibold tabular-nums">
            {isLoading ? (
              <span className="inline-block h-4 w-16 animate-pulse rounded bg-[var(--color-form)]" />
            ) : (
              costLabel
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-text-secondary)]">{t("shippingBox.eta")}</dt>
          <dd className="font-medium">{daysLabel(estimatedDays)}</dd>
        </div>
      </dl>

      {isEstimate && !isLoading && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] bg-[var(--color-warning-bg)] p-3 text-xs leading-6 text-[var(--color-warning)]"
        >
          <Info size={16} className="mt-1 shrink-0" aria-hidden />
          <span>
            {t("shippingBox.estimateNote")}{" "}
            {onRetry && (
              <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">
                {tc("retry")}
              </button>
            )}
          </span>
        </p>
      )}
    </section>
  );
}