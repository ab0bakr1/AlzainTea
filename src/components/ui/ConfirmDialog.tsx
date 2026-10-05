"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** نافذة تأكيد مبنية على عنصر <dialog> الأصلي: تحبس التركيز وتُغلق بـ Esc */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "تراجع",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !loading) onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="space-y-4 p-5">
        <h2 id="confirm-title" className="text-base font-semibold">
          {title}
        </h2>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">{children}</div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
            }`}
          >
            {loading ? "جارٍ التنفيذ…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}