// src/components/checkout/PaymentMethodPicker.tsx
// يعرض وسيلة الدفع التي سيستخدمها الخادم فعلياً.
// التوجيه خادمي بالكامل (resolveGateway): دول الخليج → البوابة المحلية بعملة الدولة، وغيرها → Stripe بالدولار.
// لذلك لا يوجد اختيار هنا: عرض خيار لا يحترمه الخادم يضلّل العميل.

"use client";

import { useTranslations } from "next-intl";
import { CreditCard, Lock } from "lucide-react";
import StepHeading from "@/components/checkout/StepHeading";

type PaymentMethodPickerProps = {
  isGulf: boolean;
  currency: string;
};

export default function PaymentMethodPicker({ isGulf, currency }: PaymentMethodPickerProps) {
  const t = useTranslations("checkout");

  return (
    <section className="space-y-5" aria-labelledby="payment-heading">
      <StepHeading id="payment-heading" as="h3">
        {t("paymentMethod")}
      </StepHeading>

      <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-primary)] bg-[var(--color-primary-200)] p-5 sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-accent-text)]"
        >
          <CreditCard size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{isGulf ? t("payment.localTitle") : t("payment.intlTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
            {isGulf ? t("payment.localDesc", { currency }) : t("payment.intlDesc")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:ms-auto">
          {(isGulf ? ["Apple Pay", "mada", "Visa"] : ["Visa", "Mastercard"]).map((label) => (
            <span
              key={label}
              className="rounded-full border border-[var(--border-color-strong)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs leading-6 text-[var(--color-text-secondary)]">
        <Lock size={14} className="mt-1 shrink-0" aria-hidden />
        <span>{t("payment.redirectNote")}</span>
      </p>
    </section>
  );
}