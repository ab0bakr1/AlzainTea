import OrderDetail from "@/components/admin/OrderDetail";

export const metadata = { title: "تفاصيل الطلب | لوحة الإدارة" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="p-6">
      <OrderDetail id={id} />
    </main>
  );
}