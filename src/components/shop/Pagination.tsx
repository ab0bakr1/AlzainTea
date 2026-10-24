// src/components/shop/Pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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

const pageBtnBase =
  "grid size-10 place-items-center rounded-full border border-[var(--border-color)] text-sm tabular-nums text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-200)] disabled:pointer-events-none disabled:opacity-40";

const pageBtnActive =
  "grid size-10 place-items-center rounded-full border border-transparent bg-[image:var(--gradient-gold)] text-sm font-semibold tabular-nums text-[var(--color-on-primary)] shadow-[var(--shadow-gold)]";

export function Pagination({ currentPage, totalPages, hasNextPage, hasPrevPage }: PaginationProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("products.catalog");
  const tc = useTranslations("common");
  const { updateFilters } = useProductFiltersUrl();

  if (totalPages <= 1) return null;

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav
      className="mt-14 flex flex-wrap items-center justify-center gap-2"
      aria-label={t("paginationLabel")}
    >
      <button
        type="button"
        disabled={!hasPrevPage}
        onClick={() => updateFilters({ page: currentPage - 1 })}
        className={pageBtnBase}
        aria-label={tc("previous")}
      >
        <PrevIcon className="size-4" aria-hidden />
      </button>

      {getPageNumbers(currentPage, totalPages).map((page, idx) =>
        page === "..." ? (
          <span
            key={`gap-${idx}`}
            className="px-1 text-[var(--color-text-disabled)]"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => updateFilters({ page })}
            aria-label={t("pageLabel", { page })}
            aria-current={page === currentPage ? "page" : undefined}
            className={page === currentPage ? pageBtnActive : pageBtnBase}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => updateFilters({ page: currentPage + 1 })}
        className={pageBtnBase}
        aria-label={tc("next")}
      >
        <NextIcon className="size-4" aria-hidden />
      </button>
    </nav>
  );
}