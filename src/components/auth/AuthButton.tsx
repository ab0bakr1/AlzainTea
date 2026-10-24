// src/components/auth/AuthButton.tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

interface AuthButtonProps extends ComponentProps<"button"> {
  loading?: boolean;
  variant?: "primary" | "outline";
}

export default function AuthButton({
  loading = false,
  variant = "primary",
  type = "button",
  disabled,
  className,
  children,
  ...props
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "ds-btn min-h-[52px] w-full cursor-pointer text-base",
        variant === "primary" ? "ds-btn-primary hover:-translate-y-px" : "ds-btn-outline",
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}