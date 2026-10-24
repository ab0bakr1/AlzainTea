"use client";

import { useTranslations } from "next-intl";
import StarRating from "@/components/shop/StarRating";
import { useAdminReviewStats } from "@/hooks/useReviews";

const card = "adm-card p-5";

export default function ReviewsStats() {
  const t = useTranslations("adminPanel.reviews.stats");
  const tc = useTranslations("adminPanel.common");
  const { data, isLoading, isError, refetch } = useAdminReviewStats();

  if (isError) {
    return (
      <p className="text-sm text-[var(--color-danger)]">
        {t("loadError")}{" "}
        <button onClick={() => refetch()} className="adm-link">
          {tc("retry")}
        </button>
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="adm-skeleton h-[104px]" />
        ))}
      </div>
    );
  }

  const items = [
    { key: "pending", value: data.pending, tone: "text-[var(--color-warning)]" },
    { key: "approved", value: data.approved, tone: "text-[var(--color-success)]" },
    { key: "rejected", value: data.rejected, tone: "text-[var(--color-danger)]" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.key} className={card}>
          <p className="adm-subtle text-sm">{t(`${s.key}.label`)}</p>
          <p className={`ds-font-heading mt-1 text-3xl font-bold tabular-nums ${s.tone}`}>
            {s.value.toLocaleString("en-US")}
          </p>
          <p className="adm-subtle mt-1 text-xs">{t(`${s.key}.hint`)}</p>
        </div>
      ))}
      <div className={card}>
        <p className="adm-subtle text-sm">{t("average.label")}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="ds-font-heading ds-text-alt text-3xl font-bold tabular-nums">
            {data.approved > 0 ? data.averageRating.toFixed(1) : "—"}
          </span>
          {data.approved > 0 && <StarRating value={data.averageRating} size={14} />}
        </div>
        <p className="adm-subtle mt-1 text-xs">{t("average.hint")}</p>
      </div>
    </div>
  );
}