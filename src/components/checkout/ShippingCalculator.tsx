// src/components/checkout/ShippingCalculator.tsx
// تفاصيل الشحن حسب الدولة. عرضية بالكامل: القيم تأتي من /api/shipping/calculate عبر CheckoutView.
// (useCountry ليس مخزناً مشتركاً — كل استدعاء له حالة مستقلة — لذلك لا نستدعيه هنا.)

type ShippingCalculatorProps = {
  countryName?: string;
  costLabel: string;
  estimatedDays?: string | null;
  isLoading?: boolean;
  /** true عندما تعذّر جلب السعر الدقيق ونعرض سعراً تقديرياً */
  isEstimate?: boolean;
  onRetry?: () => void;
};

function daysLabel(days?: string | null) {
  if (!days) return "—";
  return /^\d+$/.test(days) ? `${days} أيام عمل` : days;
}

export default function ShippingCalculator({
  countryName,
  costLabel,
  estimatedDays,
  isLoading,
  isEstimate,
  onRetry,
}: ShippingCalculatorProps) {
  return (
    <section className="p-4 rounded-xl border bg-muted/30" aria-busy={isLoading}>
      <h3 className="font-semibold mb-3">تفاصيل الشحن</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">الدولة</dt>
          <dd>{countryName ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">تكلفة الشحن</dt>
          <dd className="font-medium">
            {isLoading ? <span className="inline-block h-4 w-16 rounded bg-muted animate-pulse" /> : costLabel}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">المدة المتوقعة</dt>
          <dd>{daysLabel(estimatedDays)}</dd>
        </div>
      </dl>
      {isEstimate && !isLoading && (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          تعذّر جلب سعر الشحن الدقيق، والمعروض تقديري وسيُحسب نهائياً عند الدفع.{" "}
          {onRetry && (
            <button type="button" onClick={onRetry} className="underline">
              إعادة المحاولة
            </button>
          )}
        </p>
      )}
    </section>
  );
}