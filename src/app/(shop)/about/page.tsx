// src/app/(shop)/about/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'عن المتجر | الزين للشاي',
  description: 'تعرف على قصة الزين للشاي ورسالتنا في إيصال أجود الشايات',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">عن الزين للشاي</h1>
      {/* TODO: محتوى صفحة من نحن */}
    </div>
  )
}
