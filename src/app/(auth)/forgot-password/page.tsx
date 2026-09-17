// src/app/(auth)/forgot-password/page.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'استعادة كلمة المرور | الزين للشاي',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">استعادة كلمة المرور</h1>
        {/* TODO: نموذج إرسال رابط الاستعادة */}
      </div>
    </div>
  )
}
