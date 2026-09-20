import OrdersTable from "@/components/admin/OrdersTable";

export const metadata = { title: "الطلبات | لوحة الإدارة" };

export default function AdminOrdersPage() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">الطلبات</h1>
      <OrdersTable />
    </main>
  );
}