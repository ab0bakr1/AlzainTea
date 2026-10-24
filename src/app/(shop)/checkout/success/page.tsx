// src/app/(shop)/checkout/success/page.tsx
// نتيجة الدفع. الواجهة التفاعلية في CheckoutResult (تحتاج Suspense بسبب useSearchParams).

import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import CheckoutResult from "@/components/checkout/CheckoutResult";
import { ResultHeroSkeleton, ResultShell } from "@/components/checkout/ResultHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout.result");
  const brand = await getTranslations("brand");
  return {
    title: `${t("metaTitle")} | ${brand("name")}`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("checkout.result");

  return (
    <Suspense
      fallback={
        <ResultShell>
          <ResultHeroSkeleton label={t("loading")} />
        </ResultShell>
      }
    >
      <CheckoutResult />
    </Suspense>
  );
}