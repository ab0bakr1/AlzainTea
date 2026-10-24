import type { Metadata } from "next";
import MyOrderDetail from "@/components/shop/MyOrderDetail";

export const metadata: Metadata = {
  title: "تفاصيل الطلب | Order details",
  // صفحة خاصة بالعميل — لا تُفهرس في محركات البحث
  robots: { index: false, follow: false },
};

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // الحاوية والمسافات صارت داخل MyOrderDetail (ترويسة داكنة بعرض كامل مثل الصفحة الرئيسية)
  return <MyOrderDetail id={id} />;
}