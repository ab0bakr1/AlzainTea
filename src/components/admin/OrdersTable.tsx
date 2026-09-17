// src/components/admin/OrdersTable.tsx
// جدول الطلبات للأدمن

'use client'

type Order = {
  id: string
  status: string
  total: number
  currency: string
  country: string
  createdAt: Date
  user?: { name?: string | null; email: string } | null
}

type OrdersTableProps = {
  orders: Order[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد المعالجة',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترجع',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-start font-medium">رقم الطلب</th>
            <th className="px-4 py-3 text-start font-medium">العميل</th>
            <th className="px-4 py-3 text-start font-medium">الإجمالي</th>
            <th className="px-4 py-3 text-start font-medium">الدولة</th>
            <th className="px-4 py-3 text-start font-medium">الحالة</th>
            <th className="px-4 py-3 text-start font-medium">التاريخ</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
              <td className="px-4 py-3">{order.user?.name ?? order.user?.email ?? 'ضيف'}</td>
              <td className="px-4 py-3 font-medium">{order.total} {order.currency}</td>
              <td className="px-4 py-3">{order.country}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('ar')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
