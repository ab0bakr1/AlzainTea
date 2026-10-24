import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  fullWidth?: boolean;
  center?: boolean;
  isRounded?: boolean;
}

const Button = ({
  children,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = "button",
  className,
  center = false,
  // نفس الصفحة الرئيسية: الأزرار حبّة (pill) افتراضياً
  isRounded = true,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 border font-semibold leading-none " +
    "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out " +
    "enabled:cursor-pointer enabled:hover:-translate-y-px enabled:active:translate-y-px " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none " +
    "motion-reduce:transition-none motion-reduce:transform-none";

  const variants = {
    // ذهب مطروق + نص أسود العبوة
    primary:
      "ds-bg-gold border-transparent capitalize shadow-[var(--shadow-gold)] " +
      "enabled:hover:shadow-[0_14px_34px_rgba(201,164,92,0.5)]",
    // أسود العبوة + نص ذهبي فاتح + إطار ذهبي رفيع (يظهر جيداً في الوضعين)
    secondary:
      "border-[var(--brand-gold-deep)] bg-[var(--brand-ink)] text-[var(--brand-gold-light)] capitalize " +
      "enabled:hover:bg-[var(--brand-ink-soft)] enabled:hover:shadow-[var(--shadow-lg)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-[8px] text-[17px]",
    lg: "px-6 py-3 text-[20px]",
    xl: "px-8 py-4 text-lg",
  };

  return (
    <div className={center ? "flex justify-center" : undefined}>
      <button
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onClick={onClick}
        {...props}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          isRounded
            ? "rounded-[var(--radius-pill)]"
            : "rounded-[var(--radius-lg)]",
          className,
        )}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    </div>
  );
};

export default Button;