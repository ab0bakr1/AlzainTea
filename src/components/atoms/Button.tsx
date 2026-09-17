import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn"; // أو حسب مكان ملف cn

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
  isRounded = false,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-200 hover:scale-[1.04] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "ds-bg-primary text-white capitalize focus:ring-blue-500 cursor-pointer hover:opacity-95",
    secondary:
      "ds-bg-secondary border-2 border-skill text-white capitalize hover:opacity-95 cursor-pointer",
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
        onClick={onClick}
        {...props}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          isRounded ? "rounded-full" : "rounded-md",
          className,
        )}
      >
        {children}
      </button>
    </div>
  );
};

export default Button;
