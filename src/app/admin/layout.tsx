// src/app/admin/layout.tsx
// Layout لوحة التحكم — محمي بصلاحية ADMIN فقط

import type { ReactNode } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  // حماية — فقط ADMIN يمكنه الوصول
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* TODO: Sidebar للأدمن */}
      <aside className="w-64 bg-sidebar border-r p-4">
        <p className="font-bold text-lg mb-4">لوحة التحكم</p>
        {/* TODO: قائمة الروابط */}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
