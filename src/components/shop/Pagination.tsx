// src/components/shop/Pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { useProductFiltersUrl } from "@/hooks/useProductFiltersUrl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const withGaps: (number | "...")[] = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - (sorted[idx - 1] as number) > 1) withGaps.push("...");
    withGaps.push(page);
  });
  return withGaps;
}

export function Pagination({ currentPage, totalPages, hasNextPage, hasPrevPage }: PaginationProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { updateFilters } = useProductFiltersUrl();

  if (totalPages <= 1) return null;

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        disabled={!hasPrevPage}
        onClick={() => updateFilters({ page: currentPage - 1 })}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
        aria-label="Previous page"
      >
        <PrevIcon className="h-4 w-4" />
      </button>

      {getPageNumbers(currentPage, totalPages).map((page, idx) =>
        page === "..." ? (
          <span key={`gap-${idx}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => updateFilters({ page })}
            aria-current={page === currentPage ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => updateFilters({ page: currentPage + 1 })}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
        aria-label="Next page"
      >
        <NextIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}