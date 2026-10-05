import { Suspense } from "react";
import type { Metadata } from "next";
import OrdersTable from "@/components/admin/OrdersTable";

export const metadata: Metadata = {
  title: "إدارة الطلبات",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  // useSearchParams داخل OrdersTable يتطلب Suspense أثناء البناء
  return (
    <Suspense fallback={<p className="text-zinc-500">جارٍ التحميل…</p>}>
      <OrdersTable />
    </Suspense>
  );
}