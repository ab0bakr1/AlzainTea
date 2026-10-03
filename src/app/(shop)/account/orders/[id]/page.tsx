import type { Metadata } from "next";
import MyOrderDetail from "@/components/shop/MyOrderDetail";

export const metadata: Metadata = {
  title: "تفاصيل الطلب | Order details",
  // صفحة خاصة بالعميل — لا تُفهرس في محركات البحث
  robots: { index: false, follow: false },
};

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <MyOrderDetail id={id} />
    </div>
  );
}