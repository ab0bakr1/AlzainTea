// src/app/(shop)/checkout/cancel/page.tsx
// صفحة إلغاء أو فشل الدفع

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'تم إلغاء الدفع | الزين للشاي',
}

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-red-500 mb-4">تم إلغاء الدفع</h1>
      <p className="text-muted-foreground mb-8">
        لم يتم إتمام عملية الدفع. منتجاتك لا تزال في السلة.
      </p>
      <Link href="/cart" className="btn-primary">
        العودة إلى السلة
      </Link>
    </div>
  )
}
