// src/app/(auth)/login/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تسجيل الدخول | الزين للشاي',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">تسجيل الدخول</h1>
        {/* TODO: نموذج تسجيل الدخول مع NextAuth */}
      </div>
    </div>
  )
}
