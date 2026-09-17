// src/app/(shop)/account/addresses/page.tsx
// صفحة إدارة العناوين

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'عناويني | الزين للشاي',
}

export default function AddressesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">عناويني</h1>
      {/* TODO: قائمة العناوين المحفوظة + إضافة/تعديل/حذف */}
    </div>
  )
}
