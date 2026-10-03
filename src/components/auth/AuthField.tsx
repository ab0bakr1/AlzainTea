"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string;
  error?: string;
  toggleLabels?: { show: string; hide: string };
}

export default function AuthField({
  label, error, toggleLabels, type = "text", className, id, ...props
}: AuthFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium ds-text-primary">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && visible ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "w-full ds-bg-form ds-text-primary ds-rounded-md border px-4 py-3 outline-none transition-colors placeholder:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
            error ? "border-red-500" : "border-transparent",
            isPassword && "pe-11",
            className,
          )}
          {...props}
        />
        {isPassword && toggleLabels && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? toggleLabels.hide : toggleLabels.show}
            className="absolute inset-y-0 end-0 flex w-11 cursor-pointer items-center justify-center ds-text-secondary"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}