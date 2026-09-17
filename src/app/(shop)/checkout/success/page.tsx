// src/app/(shop)/checkout/success/page.tsx
// صفحة نجاح الدفع

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'تم الدفع بنجاح | الزين للشاي',
}

export default function CheckoutSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-green-600 mb-4">✓ تم الدفع بنجاح!</h1>
      <p className="text-muted-foreground mb-8">
        شكراً لطلبك. ستصلك رسالة تأكيد على بريدك الإلكتروني.
      </p>
      <Link href="/products" className="btn-primary">
        متابعة التسوق
      </Link>
    </div>
  )
}
