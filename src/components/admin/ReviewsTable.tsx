"use client";

import { useState } from "react";
import { useAdminReviews, useDeleteReview, useModerateReview } from "@/hooks/useReviews";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ReviewStatus } from "@/services/reviews";
import StarRating from "@/components/shop/StarRating";

const TABS: { label: string; value: ReviewStatus | undefined }[] = [
  { label: "قيد المراجعة", value: "PENDING" },
  { label: "المنشورة", value: "APPROVED" },
  { label: "المرفوضة", value: "REJECTED" },
  { label: "الكل", value: undefined },
];

const STATUS_STYLE: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "منشور",
  REJECTED: "مرفوض",
};

export default function ReviewsTable() {
  const [status, setStatus] = useState<ReviewStatus | undefined>("PENDING");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useAdminReviews({ status, page });
  const moderate = useModerateReview();
  const remove = useDeleteReview();

  const busy = moderate.isPending || remove.isPending;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              status === tab.value ? "bg-green-700 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {isLoading && <div className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}

      {data && data.items.length === 0 && <p className="py-10 text-center text-gray-500">لا توجد مراجعات</p>}

      <ul className="space-y-3">
        {data?.items.map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating value={r.rating} size={16} />
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                {r.verifiedPurchase && <span className="text-xs text-green-700">شراء موثّق</span>}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString("ar-u-nu-latn")}
              </span>
            </div>

            <p className="mt-2 text-sm">
              <span className="font-medium">{r.product.nameAr}</span>
              <span className="text-gray-500">
                {" "}
                — {r.user.name} ({r.user.email})
              </span>
            </p>
            {r.comment && <p className="mt-2 whitespace-pre-line text-gray-700 dark:text-gray-300">{r.comment}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "APPROVED" && (
                <button
                  disabled={busy}
                  onClick={() => run(() => moderate.mutateAsync({ id: r.id, status: "APPROVED" }))}
                  className="rounded-md bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  قبول ونشر
                </button>
              )}
              {r.status !== "REJECTED" && (
                <button
                  disabled={busy}
                  onClick={() => run(() => moderate.mutateAsync({ id: r.id, status: "REJECTED" }))}
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                >
                  رفض
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm("حذف المراجعة نهائياً؟ لا يمكن التراجع.")) {
                    run(() => remove.mutateAsync(r.id));
                  }
                }}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <button
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}