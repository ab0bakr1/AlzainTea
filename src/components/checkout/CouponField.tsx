// src/components/checkout/CouponField.tsx
// إدخال كوبون الخصم وتطبيقه/إزالته. التحقق الفعلي يتم في الخادم (POST /api/coupons/validate).

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tag } from "lucide-react";

type CouponFieldProps = {
  applied: { code: string; discountLabel: string } | null;
  loading: boolean;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
};

export default function CouponField({ applied, loading, error, onApply, onRemove }: CouponFieldProps) {
  const t = useTranslations("checkout");
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--color-primary)] bg-[var(--color-primary-200)] p-4">
        <div className="flex items-center gap-3 text-sm">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-accent-text)]"
          >
            <Tag size={18} />
          </span>
          <div>
            <p className="font-semibold" dir="ltr" style={{ textAlign: "start" }}>
              {applied.code}
            </p>
            <p className="text-[var(--color-text-secondary)]">
              {t("coupon.appliedWith", { amount: applied.discountLabel })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-sm font-medium underline underline-offset-4"
        >
          {t("coupon.remove")}
        </button>
      </div>
    );
  }

  function submit() {
    const trimmed = code.trim();
    if (trimmed && !loading) onApply(trimmed);
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--color-bg-alt)] p-5">
      <label htmlFor="coupon-code" className="text-sm font-semibold">
        {t("coupon.label")}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          dir="ltr"
          autoCapitalize="characters"
          placeholder={t("coupon.placeholder")}
          aria-invalid={!!error}
          aria-describedby={error ? "coupon-error" : undefined}
          className="ds-input flex-1 rounded-[var(--radius-lg)] text-sm uppercase"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || !code.trim()}
          className="ds-btn ds-btn-outline px-5 text-sm disabled:opacity-50"
        >
          {loading ? t("coupon.verifying") : t("coupon.apply")}
        </button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}