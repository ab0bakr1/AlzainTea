// src/components/checkout/CouponField.tsx
// إدخال كوبون الخصم وتطبيقه/إزالته. التحقق الفعلي يتم في الخادم (POST /api/coupons/validate).

"use client";

import { useState } from "react";

type CouponFieldProps = {
  applied: { code: string; discountLabel: string } | null;
  loading: boolean;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
};

export default function CouponField({ applied, loading, error, onApply, onRemove }: CouponFieldProps) {
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-primary bg-muted/30">
        <div className="text-sm">
          <p className="font-medium" dir="ltr" style={{ textAlign: "start" }}>
            {applied.code}
          </p>
          <p className="text-muted-foreground">تم تطبيق الخصم: {applied.discountLabel}</p>
        </div>
        <button type="button" onClick={onRemove} className="text-sm underline underline-offset-4">
          إزالة
        </button>
      </div>
    );
  }

  function submit() {
    const trimmed = code.trim();
    if (trimmed && !loading) onApply(trimmed);
  }

  return (
    <div className="space-y-2">
      <label htmlFor="coupon-code" className="text-sm font-medium">
        لديك كوبون خصم؟
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
          aria-invalid={!!error}
          aria-describedby={error ? "coupon-error" : undefined}
          className="flex-1 px-4 py-2 rounded-xl border bg-background text-sm uppercase"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || !code.trim()}
          className="px-5 py-2 rounded-xl border text-sm font-medium disabled:opacity-50"
        >
          {loading ? "جارٍ التحقق…" : "تطبيق"}
        </button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}