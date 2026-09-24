"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchOverviewReport } from "@/services/reports";

export function useOverviewReport(days: number) {
  return useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => fetchOverviewReport(days),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}