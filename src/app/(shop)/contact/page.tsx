// src/app/(shop)/contact/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تواصل معنا | الزين للشاي',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">تواصل معنا</h1>
      {/* TODO: نموذج التواصل + معلومات الاتصال */}
    </div>
  )
}
