"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useCreateReview, useProductReviews } from "@/hooks/useReviews";
import { getErrorMessage } from "@/lib/get-error-message";
import StarRating from "./StarRating";

interface Props {
  productId: string;
  slug: string;
}

export default function ProductReviews({ productId, slug }: Props) {
  const locale = useLocale();
  const t = useTranslations("reviews");
  const tc = useTranslations("common");
  const { status } = useSession();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProductReviews(slug, page);
  const create = useCreateReview(slug);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setFormError(null);
    if (rating < 1) return setFormError(t("pickRating"));
    try {
      await create.mutateAsync({ productId, rating, comment: comment.trim() || undefined });
      setSubmitted(true);
      setRating(0);
      setComment("");
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }

  const summary = data?.summary;
  const viewer = data?.viewer;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-US", { dateStyle: "medium" });

  return (
    <section className="space-y-8" aria-labelledby="reviews-title">
      <div>
        <h2 id="reviews-title" className="ds-font-heading">
          {t("title")}
        </h2>
        <div className="ds-gold-rule mt-3 max-w-48" aria-hidden />
      </div>

      {isLoading && <div className="ds-rounded-xl h-24 animate-pulse bg-[var(--color-form)]" />}

      {summary && summary.count > 0 && (
        <div className="ds-card ds-shadow-sm flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="text-center sm:min-w-44">
            <div className="ds-price text-5xl">{summary.average.toFixed(1)}</div>
            <div className="mt-1 flex justify-center">
              <StarRating value={summary.average} />
            </div>
            <p className="ds-text-secondary mt-1 text-sm">{t("count", { count: summary.count })}</p>
          </div>
          <div className="flex-1 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const pct = summary.count ? (summary.distribution[n] / summary.count) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="ds-numeric ds-text-secondary w-3 text-center">{n}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-form)]">
                    <div className="ds-bg-gold h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ds-numeric ds-text-secondary w-8 text-end">{summary.distribution[n]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data && data.items.length === 0 && <p className="ds-text-secondary">{t("noReviews")}</p>}

      <ul className="space-y-4">
        {data?.items.map((r) => (
          <li key={r.id} className="ds-card ds-rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating value={r.rating} size={16} />
              <span className="ds-text-primary font-semibold">{r.authorName}</span>
              {r.verifiedPurchase && (
                <span className="ds-badge ds-badge-success">{t("verifiedPurchase")}</span>
              )}
              <span className="ds-text-disabled ds-numeric text-xs">{dateFmt.format(new Date(r.createdAt))}</span>
            </div>
            {r.comment && <p className="ds-text-secondary mt-3 leading-relaxed whitespace-pre-line">{r.comment}</p>}
          </li>
        ))}
      </ul>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="ds-btn ds-btn-outline min-h-10 px-5 text-sm"
          >
            {tc("previous")}
          </button>
          <span className="ds-numeric ds-text-secondary text-sm">
            {page} / {data.meta.totalPages}
          </span>
          <button
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="ds-btn ds-btn-outline min-h-10 px-5 text-sm"
          >
            {tc("next")}
          </button>
        </div>
      )}

      {/* منطقة كتابة التقييم */}
      <div className="ds-card ds-rounded-2xl p-5 sm:p-6">
        {status === "unauthenticated" && (
          <Link
            href={`/login?callbackUrl=/products/${slug}`}
            className="ds-text-alt font-semibold underline underline-offset-4"
          >
            {t("loginLink")}
          </Link>
        )}

        {status === "authenticated" && viewer?.hasReviewed && viewer.myReview && (
          <p className="ds-text-secondary">
            {viewer.myReview.status === "PENDING" && t("pending")}
            {viewer.myReview.status === "APPROVED" && t("approved")}
            {viewer.myReview.status === "REJECTED" && t("rejected")}
          </p>
        )}

        {status === "authenticated" && viewer && !viewer.hasReviewed && !viewer.canReview && (
          <p className="ds-text-secondary">{t("purchaseRequired")}</p>
        )}

        {status === "authenticated" && viewer?.canReview && !submitted && (
          <div className="space-y-5">
            <h3 className="ds-font-heading">{t("writeReview")}</h3>
            <div>
              <p className="ds-text-primary mb-2 text-sm font-medium">{t("yourRating")}</p>
              <StarRating value={rating} size={28} onChange={setRating} />
            </div>
            <div>
              <label className="ds-text-primary mb-2 block text-sm font-medium" htmlFor="review-comment">
                {t("comment")}
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={t("commentPlaceholder")}
                className="ds-input py-3"
              />
            </div>
            {formError && <p className="text-sm text-[var(--color-danger)]">{formError}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={create.isPending}
              className="ds-btn ds-btn-primary px-8"
            >
              {create.isPending ? t("submitting") : t("submit")}
            </button>
          </div>
        )}

        {submitted && <p className="font-medium text-[var(--color-success)]">{t("thankYou")}</p>}
      </div>
    </section>
  );
}