"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string;
  error?: string;
  icon?: ReactNode;
  /** عنصر بجانب التسمية (مثل رابط «نسيت كلمة المرور؟») */
  labelAside?: ReactNode;
  toggleLabels?: { show: string; hide: string };
}

export default function AuthField({
  label,
  error,
  icon,
  labelAside,
  toggleLabels,
  type = "text",
  className,
  id,
  dir,
  ...props
}: AuthFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const hasToggle = isPassword && !!toggleLabels;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
        {labelAside}
      </div>

      {/* dir على الغلاف أيضاً ليبقى موضع الأيقونة متسقاً مع اتجاه الإدخال */}
      <div className="relative" dir={dir}>
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--color-text-disabled)] [&>svg]:size-5"
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && visible ? "text" : type}
          dir={dir}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 w-full rounded-[var(--radius-lg)] border bg-[var(--color-form)] text-base text-[var(--color-text-primary)]",
            "placeholder:text-[var(--color-text-disabled)] outline-none transition-[border-color,box-shadow] duration-150",
            "hover:border-[var(--border-color-strong)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/40",
            icon ? "ps-11" : "ps-4",
            hasToggle ? "pe-12" : "pe-4",
            error ? "border-[var(--color-danger)]" : "border-[var(--border-color)]",
            className,
          )}
          {...props}
        />
        {hasToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? toggleLabels.hide : toggleLabels.show}
            className="absolute inset-y-0 end-0 flex w-12 cursor-pointer items-center justify-center rounded-e-[var(--radius-lg)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}