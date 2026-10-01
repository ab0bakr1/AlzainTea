// src/app/(shop)/cart/page.tsx
// صفحة سلة التسوق — Server Component للـ metadata، والواجهة التفاعلية في CartView.

import type { Metadata } from 'next'
import CartView from '@/components/shop/CartView'

export const metadata: Metadata = {
  title: 'سلة التسوق | الزين للشاي',
}

export default function CartPage() {
  return <CartView />
}