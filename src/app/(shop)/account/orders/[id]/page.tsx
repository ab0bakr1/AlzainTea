import MyOrderDetail from "@/components/shop/MyOrderDetail";

export const metadata = { title: "تفاصيل الطلب" };

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <MyOrderDetail id={id} />
    </div>
  );
}