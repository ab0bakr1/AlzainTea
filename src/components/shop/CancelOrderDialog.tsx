"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  paid: boolean;
  pending: boolean;
  error: string | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  lang: "ar" | "en";
}

export function CancelOrderDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("orders.detail.dialog");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (p.open && !d.open) d.showModal();
    if (!p.open && d.open) d.close();
  }, [p.open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cancel-order-title"
      onClose={p.onClose}
      onCancel={(e) => {
        if (p.pending) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !p.pending) p.onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] p-0 text-[var(--color-text-primary)] shadow-[var(--shadow-lg)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div aria-hidden className="h-1 w-full" style={{ backgroundImage: "var(--gradient-gold)" }} />
      <div className="space-y-5 p-6 md:p-7">
        <div>
          <h2 id="cancel-order-title" className="ds-font-heading text-2xl font-bold">
            {t("title")}
          </h2>
          <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
        </div>
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
          {p.paid ? t("paid") : t("unpaid")}
        </p>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">{t("reasonLabel")}</span>
          <textarea
            value={p.reason}
            onChange={(e) => p.onReasonChange(e.target.value)}
            maxLength={200}
            rows={3}
            disabled={p.pending}
            className="ds-input resize-none py-3 text-sm"
          />
        </label>

        {p.error && (
          <p
            role="alert"
            className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]"
          >
            {p.error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={p.onClose}
            disabled={p.pending}
            className="ds-btn ds-btn-outline px-6 text-sm"
          >
            {t("keep")}
          </button>
          <button
            type="button"
            onClick={p.onConfirm}
            disabled={p.pending}
            className="ds-btn border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-6 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]"
          >
            {p.pending ? t("working") : t("confirm")}
          </button>
        </div>
      </div>
    </dialog>
  );
}