// src/app/(shop)/cart/page.tsx
// صفحة سلة التسوق

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سلة التسوق | الزين للشاي',
}

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">سلة التسوق</h1>
      {/* TODO: عرض عناصر السلة + ملخص الطلب + زر الدفع */}
    </div>
  )
}
