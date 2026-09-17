// src/app/(shop)/account/page.tsx
// صفحة الملف الشخصي

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'حسابي | الزين للشاي',
}

export default function AccountPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">حسابي</h1>
      {/* TODO: معلومات المستخدم + روابط للطلبات والعناوين */}
    </div>
  )
}
