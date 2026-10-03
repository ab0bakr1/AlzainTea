"use client";

import { useEffect, useRef } from "react";

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

const COPY = {
  ar: {
    title: "إلغاء الطلب",
    unpaid: "سيتم إلغاء هذا الطلب وتحرير الكمية المحجوزة.",
    paid: "سيتم إلغاء الطلب واسترداد المبلغ كاملاً إلى وسيلة الدفع الأصلية. لا يمكن التراجع عن هذا الإجراء.",
    reasonLabel: "سبب الإلغاء (اختياري)",
    keep: "الاحتفاظ بالطلب",
    confirm: "تأكيد الإلغاء",
    working: "جارٍ الإلغاء…",
  },
  en: {
    title: "Cancel order",
    unpaid: "This order will be cancelled and the reserved items released.",
    paid: "The order will be cancelled and the full amount refunded to your original payment method. This can't be undone.",
    reasonLabel: "Reason for cancelling (optional)",
    keep: "Keep order",
    confirm: "Confirm cancellation",
    working: "Cancelling…",
  },
} as const;

export function CancelOrderDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = COPY[p.lang];

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-xl)] border border-[var(--color-form)] bg-[var(--color-bg)] p-0 text-[var(--color-text-primary)] shadow-[var(--shadow-lg)] backdrop:bg-black/50"
    >
      <div className="space-y-4 p-6">
        <h2 id="cancel-order-title" className="text-lg font-semibold">
          {t.title}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{p.paid ? t.paid : t.unpaid}</p>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.reasonLabel}</span>
          <textarea
            value={p.reason}
            onChange={(e) => p.onReasonChange(e.target.value)}
            maxLength={200}
            rows={3}
            disabled={p.pending}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-form)] bg-[var(--color-bg-alt)] p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-[var(--focus-ring-color)]"
          />
        </label>

        {p.error && (
          <p role="alert" className="rounded-[var(--radius-md)] bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-500/15 dark:text-red-300">
            {p.error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={p.onClose}
            disabled={p.pending}
            className="rounded-[var(--radius-md)] border border-[var(--color-form)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-bg-alt)] disabled:opacity-50"
          >
            {t.keep}
          </button>
          <button
            type="button"
            onClick={p.onConfirm}
            disabled={p.pending}
            className="rounded-[var(--radius-md)] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {p.pending ? t.working : t.confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}