"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useCreateReview, useProductReviews } from "@/hooks/useReviews";
import { getErrorMessage } from "@/lib/get-error-message";
import StarRating from "./StarRating";

const T = {
  ar: {
    title: "تقييمات العملاء",
    noReviews: "لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج.",
    verified: "شراء موثّق",
    outOf: "من 5",
    reviews: "تقييم",
    write: "اكتب تقييمك",
    yourRating: "تقييمك",
    comment: "تعليقك (اختياري)",
    submit: "إرسال التقييم",
    sending: "جارٍ الإرسال...",
    thanks: "شكراً! سيظهر تقييمك بعد مراجعته من الإدارة.",
    login: "سجّل الدخول لكتابة تقييم",
    needPurchase: "يمكنك تقييم المنتجات التي استلمتها فقط.",
    pending: "تقييمك قيد المراجعة.",
    approved: "تم نشر تقييمك. شكراً لك!",
    rejected: "لم يتم قبول تقييمك.",
    prev: "السابق",
    next: "التالي",
    pickRating: "الرجاء اختيار عدد النجوم",
  },
  en: {
    title: "Customer reviews",
    noReviews: "No reviews yet. Be the first to review this product.",
    verified: "Verified purchase",
    outOf: "out of 5",
    reviews: "reviews",
    write: "Write a review",
    yourRating: "Your rating",
    comment: "Your comment (optional)",
    submit: "Submit review",
    sending: "Submitting...",
    thanks: "Thank you! Your review will appear after moderation.",
    login: "Sign in to write a review",
    needPurchase: "Only customers who received this product can review it.",
    pending: "Your review is awaiting moderation.",
    approved: "Your review is published. Thank you!",
    rejected: "Your review was not approved.",
    prev: "Previous",
    next: "Next",
    pickRating: "Please select a star rating",
  },
} as const;

interface Props {
  productId: string;
  slug: string;
}

export default function ProductReviews({ productId, slug }: Props) {
  const locale = useLocale();
  const t = locale === "ar" ? T.ar : T.en;
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
    if (rating < 1) return setFormError(t.pickRating);
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
    <section className="mt-12 space-y-8" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-2xl font-bold">
        {t.title}
      </h2>

      {isLoading && <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}

      {summary && summary.count > 0 && (
        <div className="flex flex-col gap-6 rounded-xl border p-5 sm:flex-row sm:items-center">
          <div className="text-center sm:min-w-40">
            <div className="text-5xl font-bold">{summary.average.toFixed(1)}</div>
            <StarRating value={summary.average} />
            <p className="mt-1 text-sm text-gray-500">
              {summary.count} {t.reviews}
            </p>
          </div>
          <div className="flex-1 space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const pct = summary.count ? (summary.distribution[n] / summary.count) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-center">{n}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-end text-gray-500">{summary.distribution[n]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data && data.items.length === 0 && <p className="text-gray-500">{t.noReviews}</p>}

      <ul className="space-y-5">
        {data?.items.map((r) => (
          <li key={r.id} className="border-b pb-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating value={r.rating} size={16} />
              <span className="font-medium">{r.authorName}</span>
              {r.verifiedPurchase && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  {t.verified}
                </span>
              )}
              <span className="text-xs text-gray-500">{dateFmt.format(new Date(r.createdAt))}</span>
            </div>
            {r.comment && <p className="mt-2 whitespace-pre-line text-gray-700 dark:text-gray-300">{r.comment}</p>}
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
            {t.prev}
          </button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <button
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      )}

      {/* منطقة كتابة التقييم */}
      <div className="rounded-xl border p-5">
        {status === "unauthenticated" && (
          <Link href={`/login?callbackUrl=/products/${slug}`} className="text-green-700 underline">
            {t.login}
          </Link>
        )}

        {status === "authenticated" && viewer?.hasReviewed && viewer.myReview && (
          <p className="text-gray-700 dark:text-gray-300">
            {viewer.myReview.status === "PENDING" && t.pending}
            {viewer.myReview.status === "APPROVED" && t.approved}
            {viewer.myReview.status === "REJECTED" && t.rejected}
          </p>
        )}

        {status === "authenticated" && viewer && !viewer.hasReviewed && !viewer.canReview && (
          <p className="text-gray-500">{t.needPurchase}</p>
        )}

        {status === "authenticated" && viewer?.canReview && !submitted && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t.write}</h3>
            <div>
              <p className="mb-1 text-sm">{t.yourRating}</p>
              <StarRating value={rating} size={28} onChange={setRating} />
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="review-comment">
                {t.comment}
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-md border bg-transparent p-3"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={create.isPending}
              className="rounded-md bg-green-700 px-5 py-2 text-white transition hover:bg-green-800 disabled:opacity-60"
            >
              {create.isPending ? t.sending : t.submit}
            </button>
          </div>
        )}

        {submitted && <p className="text-green-700 dark:text-green-400">{t.thanks}</p>}
      </div>
    </section>
  );
}