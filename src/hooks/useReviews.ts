"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkReviews,
  createReview,
  deleteReview,
  fetchAdminReviews,
  fetchAdminReviewStats,
  fetchProductReviews,
  moderateReview,
  type AdminReviewsParams,
} from "@/services/reviews";

export function useProductReviews(slug: string, page: number) {
  return useQuery({
    queryKey: ["reviews", slug, page],
    queryFn: () => fetchProductReviews(slug, page),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useCreateReview(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews", slug] }),
  });
}

// ===== الإدارة =====
export function useAdminReviews(params: AdminReviewsParams) {
  return useQuery({
    queryKey: ["admin-reviews", "list", params],
    queryFn: () => fetchAdminReviews(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReviewStats() {
  return useQuery({
    queryKey: ["admin-reviews", "stats"],
    queryFn: fetchAdminReviewStats,
    staleTime: 30_000,
  });
}

/** أي تغيير إداري يؤثر على: القوائم والعدّادات + مؤشر "بانتظار الاعتماد" في اللوحة + المراجعات العامة */
function useInvalidateAfterModeration() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
      qc.invalidateQueries({ queryKey: ["admin-overview"] }),
      qc.invalidateQueries({ queryKey: ["reviews"] }),
    ]);
}

export function useModerateReview() {
  const invalidate = useInvalidateAfterModeration();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      moderateReview(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidateAfterModeration();
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: invalidate,
  });
}

export function useBulkReviews() {
  const invalidate = useInvalidateAfterModeration();
  return useMutation({
    mutationFn: bulkReviews,
    onSuccess: invalidate,
  });
}