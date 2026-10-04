// src/app/admin/products/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { ProductsTable } from "@/components/admin/ProductsTable";

export const metadata = { title: "إدارة المنتجات" };

export default function AdminProductsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-800">المنتجات</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          إضافة منتج
        </Link>
      </div>

      {/* useSearchParams داخل ProductsTable يتطلب Suspense */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-stone-100" />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}