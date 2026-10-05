import { Suspense } from "react";
import type { Metadata } from "next";
import ReviewsStats from "@/components/admin/ReviewsStats";
import ReviewsTable from "@/components/admin/ReviewsTable";

export const metadata: Metadata = {
  title: "إدارة المراجعات",
  robots: { index: false, follow: false },
};

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">المراجعات</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          راجع تقييمات العملاء قبل نشرها في المتجر. المراجعات المنشورة فقط تظهر للزوار وتدخل في متوسط تقييم المنتج.
        </p>
      </header>

      <ReviewsStats />

      {/* useSearchParams داخل ReviewsTable يتطلب Suspense أثناء البناء */}
      <Suspense fallback={<p className="text-zinc-500">جارٍ التحميل…</p>}>
        <ReviewsTable />
      </Suspense>
    </div>
  );
}