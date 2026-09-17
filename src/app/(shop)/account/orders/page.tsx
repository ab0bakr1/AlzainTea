// src/app/(shop)/account/orders/page.tsx
// صفحة تتبع الطلبات

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'طلباتي | الزين للشاي',
}

export default function OrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">طلباتي</h1>
      {/* TODO: جلب طلبات المستخدم الحالي وعرضها مع حالة كل طلب */}
    </div>
  )
}
