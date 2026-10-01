// src/app/(shop)/checkout/page.tsx
// صفحة إتمام الشراء — Server Component للـ metadata، والواجهة التفاعلية في CheckoutView.
// (نفس نمط cart/page.tsx)

import type { Metadata } from 'next'
import CheckoutView from '@/components/checkout/CheckoutView'

export const metadata: Metadata = {
  title: 'الدفع | الزين للشاي',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return <CheckoutView />
}