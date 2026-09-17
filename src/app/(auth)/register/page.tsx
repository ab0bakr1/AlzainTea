// src/app/(auth)/register/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'إنشاء حساب | الزين للشاي',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">إنشاء حساب جديد</h1>
        {/* TODO: نموذج التسجيل */}
      </div>
    </div>
  )
}
