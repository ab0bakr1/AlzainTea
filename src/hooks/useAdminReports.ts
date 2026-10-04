"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchLowStockReport, fetchOverviewReport } from "@/services/reports";

export const ADMIN_REPORT_KEYS = ["admin-overview", "admin-low-stock"] as const;

export function useOverviewReport(days: number) {
  return useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => fetchOverviewReport(days),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useLowStockReport(threshold: number) {
  return useQuery({
    queryKey: ["admin-low-stock", threshold],
    queryFn: () => fetchLowStockReport(threshold),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}