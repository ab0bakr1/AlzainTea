// src/app/(shop)/checkout/success/page.tsx
// نتيجة الدفع. الواجهة التفاعلية في CheckoutResult (تحتاج Suspense بسبب useSearchParams).

import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutResult from "@/components/checkout/CheckoutResult";

export const metadata: Metadata = {
  title: "نتيجة الدفع | الزين للشاي",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 max-w-2xl" aria-busy="true">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      }
    >
      <CheckoutResult />
    </Suspense>
  );
}