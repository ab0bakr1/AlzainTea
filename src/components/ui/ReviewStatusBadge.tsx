"use client";

import { useLocale } from "next-intl";
import type { ReviewStatus } from "@/services/reviews";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, { ar: string; en: string }> = {
  PENDING: { ar: "قيد المراجعة", en: "Pending" },
  APPROVED: { ar: "منشورة", en: "Published" },
  REJECTED: { ar: "مرفوضة", en: "Rejected" },
};

const REVIEW_TONE: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  return <span className={`${base} ${REVIEW_TONE[status]}`}>{REVIEW_STATUS_LABELS[status][locale]}</span>;
}