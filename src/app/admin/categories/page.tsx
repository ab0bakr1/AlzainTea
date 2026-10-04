import Link from "next/link";
import { Suspense } from "react";
import { CategoriesTable } from "@/components/admin/CategoriesTable";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">الفئات</h1>
          <p className="mt-1 text-sm text-stone-500">إدارة فئات وأقسام الشاي والفئات الفرعية</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          + إضافة فئة
        </Link>
      </div>

      {/* useSearchParams داخل الجدول يتطلب Suspense */}
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg border border-stone-200 bg-stone-50" />}
      >
        <CategoriesTable />
      </Suspense>
    </div>
  );
}