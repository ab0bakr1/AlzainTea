// src/app/(shop)/faq/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة | الزين للشاي',
}

export default function FaqPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">الأسئلة الشائعة</h1>
      {/* TODO: accordion بالأسئلة والأجوبة */}
    </div>
  )
}
