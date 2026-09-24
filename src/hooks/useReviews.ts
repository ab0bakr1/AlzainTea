"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReview,
  deleteReview,
  fetchAdminReviews,
  fetchProductReviews,
  moderateReview,
  type ReviewStatus,
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
export function useAdminReviews(params: { status?: ReviewStatus; page: number }) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => fetchAdminReviews(params),
    placeholderData: keepPreviousData,
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      moderateReview(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}