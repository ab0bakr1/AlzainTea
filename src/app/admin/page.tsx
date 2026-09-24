// src/app/admin/page.tsx
// لوحة التحكم — إحصائيات المبيعات
import DashboardStats from "@/components/admin/DashboardStats";


import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'لوحة التحكم | الزين للشاي',
}

export default async function AdminDashboardPage() {
  // TODO: جلب إحصائيات المبيعات من Prisma
  const stats = {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">لوحة التحكم</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الطلبات" value={stats.totalOrders} />
        <StatCard title="الإيرادات ($)" value={stats.totalRevenue} />
        <StatCard title="طلبات معلقة" value={stats.pendingOrders} />
        <StatCard title="المنتجات" value={stats.totalProducts} />
      </div>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <DashboardStats />
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-6 rounded-xl border bg-card">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
