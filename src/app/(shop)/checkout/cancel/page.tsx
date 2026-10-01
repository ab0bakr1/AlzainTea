// src/app/(shop)/checkout/cancel/page.tsx
// إلغاء الدفع من صفحة البوابة. صفحة ثابتة بلا استدعاء API: المخزون يُحرَّر عبر Webhook أو Cron.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "لم يكتمل الدفع | الزين للشاي",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ orderId?: string | string[] }> };

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.orderId) ? sp.orderId[0] : sp.orderId;
  const ref = raw && /^[a-z0-9]{8,40}$/i.test(raw) ? `#${raw.slice(-8).toUpperCase()}` : null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <h1 className="text-2xl font-bold mb-3">لم يكتمل الدفع</h1>
      {ref && <p className="text-sm text-muted-foreground mb-3">رقم الطلب: {ref}</p>}
      <p className="text-muted-foreground mb-2">سلتك محفوظة ولم يُسجَّل طلبك كمدفوع.</p>
      <p className="text-sm text-muted-foreground mb-8">
        نحجز منتجاتك لمدة تصل إلى 60 دقيقة ثم تعود للمخزون تلقائياً.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/checkout"
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          إعادة المحاولة
        </Link>
        <Link href="/cart" className="px-6 py-2 rounded-xl border text-sm font-medium">
          العودة إلى السلة
        </Link>
      </div>
    </div>
  );
}