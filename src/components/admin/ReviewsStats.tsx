"use client";

import StarRating from "@/components/shop/StarRating";
import { useAdminReviewStats } from "@/hooks/useReviews";

const card = "rounded-xl border border-zinc-200 p-4 dark:border-zinc-800";

export default function ReviewsStats() {
  const { data, isLoading, isError, refetch } = useAdminReviewStats();

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        تعذّر تحميل الإحصائيات.{" "}
        <button onClick={() => refetch()} className="underline underline-offset-2">
          إعادة المحاولة
        </button>
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${card} h-[88px] animate-pulse bg-zinc-100 dark:bg-zinc-900`} />
        ))}
      </div>
    );
  }

  const items = [
    { label: "قيد المراجعة", value: data.pending, hint: "تحتاج قراراً منك", tone: "text-amber-700 dark:text-amber-300" },
    { label: "منشورة", value: data.approved, hint: "ظاهرة في المتجر", tone: "text-emerald-700 dark:text-emerald-300" },
    { label: "مرفوضة", value: data.rejected, hint: "مخفية عن العملاء", tone: "text-red-700 dark:text-red-300" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className={card}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone}`}>
            {s.value.toLocaleString("en-US")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{s.hint}</p>
        </div>
      ))}
      <div className={card}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">متوسط التقييم</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {data.approved > 0 ? data.averageRating.toFixed(1) : "—"}
          </span>
          {data.approved > 0 && <StarRating value={data.averageRating} size={14} />}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">من المراجعات المنشورة فقط</p>
      </div>
    </div>
  );
}