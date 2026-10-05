"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReviewSort, ReviewStatus } from "@/services/reviews";

const STATUSES: readonly ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const SORTS: readonly ReviewSort[] = ["newest", "oldest", "rating_desc", "rating_asc"];
const RATINGS = ["1", "2", "3", "4", "5"] as const;

/** التبويب الافتراضي: ما يحتاج المشرف إلى مراجعته أولاً */
const DEFAULT_STATUS: ReviewStatus = "PENDING";

export interface AdminReviewFilters {
  /** "" = الكل (يُكتب في الرابط كـ status=ALL) */
  status: ReviewStatus | "";
  q: string;
  rating: "" | (typeof RATINGS)[number];
  verified: "" | "true" | "false";
  sort: ReviewSort;
  page: number;
}

function parse(sp: URLSearchParams): AdminReviewFilters {
  const rawStatus = sp.get("status");
  const status: AdminReviewFilters["status"] =
    rawStatus === "ALL"
      ? ""
      : STATUSES.includes(rawStatus as ReviewStatus)
        ? (rawStatus as ReviewStatus)
        : DEFAULT_STATUS;

  const rawRating = sp.get("rating");
  const rawVerified = sp.get("verified");
  const rawSort = sp.get("sort");
  const page = Number.parseInt(sp.get("page") ?? "1", 10);

  return {
    status,
    q: (sp.get("q") ?? "").slice(0, 100),
    rating: RATINGS.includes(rawRating as (typeof RATINGS)[number])
      ? (rawRating as (typeof RATINGS)[number])
      : "",
    verified: rawVerified === "true" || rawVerified === "false" ? rawVerified : "",
    sort: SORTS.includes(rawSort as ReviewSort) ? (rawSort as ReviewSort) : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function serialize(f: AdminReviewFilters): string {
  const p = new URLSearchParams();
  if (f.status !== DEFAULT_STATUS) p.set("status", f.status === "" ? "ALL" : f.status);
  if (f.q) p.set("q", f.q);
  if (f.rating) p.set("rating", f.rating);
  if (f.verified) p.set("verified", f.verified);
  if (f.sort !== "newest") p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

export function useAdminReviewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parse(new URLSearchParams(searchParams.toString())), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<AdminReviewFilters>) => {
      const next = { ...filters, ...patch };
      // أي تغيير في الفلاتر يعيد الترقيم للصفحة الأولى، إلا إذا غُيّرت الصفحة نفسها
      if (!("page" in patch)) next.page = 1;
      const qs = serialize(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  /** يمسح البحث والفلاتر الإضافية فقط، ويُبقي تبويب الحالة كما هو */
  const reset = useCallback(
    () => setFilters({ q: "", rating: "", verified: "", sort: "newest" }),
    [setFilters],
  );

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0);

  return { filters, setFilters, reset, activeCount };
}