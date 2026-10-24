// src/app/(shop)/checkout/cancel/page.tsx
// إلغاء الدفع من صفحة البوابة. صفحة ثابتة بلا استدعاء API: المخزون يُحرَّر عبر Webhook أو Cron.

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResultHero, ResultShell, resultBtn } from "@/components/checkout/ResultHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout.cancel");
  const brand = await getTranslations("brand");
  return {
    title: `${t("title")} | ${brand("name")}`,
    robots: { index: false, follow: false },
  };
}

type Props = { searchParams: Promise<{ orderId?: string | string[] }> };

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.orderId) ? sp.orderId[0] : sp.orderId;
  const ref = raw && /^[a-z0-9]{8,40}$/i.test(raw) ? `#${raw.slice(-8).toUpperCase()}` : null;

  const t = await getTranslations("checkout");

  return (
    <ResultShell>
      <ResultHero
        tone="failed"
        title={t("cancel.title")}
        refLabel={t("cancel.orderRef")}
        refValue={ref}
        description={t("cancel.savedNote")}
        note={t("cancel.holdNote")}
      >
        <Link href="/checkout" className={resultBtn.primary}>
          {t("cancel.tryAgain")}
        </Link>
        <Link href="/cart" className={resultBtn.secondary}>
          {t("cancel.backToCart")}
        </Link>
        <Link href="/contact" className={resultBtn.ghost}>
          {t("result.contactUs")}
        </Link>
      </ResultHero>
    </ResultShell>
  );
}