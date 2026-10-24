import { cn } from "@/lib/cn";
interface Props {
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  center?: boolean;
  variant?: "primary" | "secondary" | "accent" | "inverse" | "disabled";
  className?: string;
}

export default function Text({
  children,
  size = "md",
  center = false,
  variant = "primary",
  className = "pt-2.5 capitalize font-normal",
}: Props) {
  // ارتفاع الأسطر مطابق للصفحة الرئيسية (leading-7 / leading-8) لراحة القراءة بالعربية
  const sizes = {
    sm: "ds-text-sm leading-7",
    md: "ds-text-base leading-7",
    lg: "ds-text-lg leading-8",
  };
  const variants = {
    primary: "ds-text-primary",
    secondary: "ds-text-secondary", // مثل --h-muted في الرئيسية
    accent: "ds-text-alt", // ذهبي غامق متوافق مع WCAG
    inverse: "ds-text-inverse", // للأقسام الداكنة (Hero / CTA / Footer)
    disabled: "ds-text-disabled",
  };

  return (
    <>
      <p
        className={cn(
          "ds-font-sans",
          sizes[size],
          variants[variant],
          center ? "text-center" : "",
          className,
        )}
      >
        {children}
      </p>
    </>
  );
}