import { cn } from "@/lib/cn";
interface Props {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl";
  variant?: "black" | "gray" | "primary" | "inverse" | "gold" | "disabled";
  center?: boolean;
  className?: string;
}
export default function Title({
  children,
  size = "md",
  variant = "black",
  center = false,
  className = "p-0 capitalize font-bold",
}: Props) {
  // أحجام متجاوبة بنفس سلّم عناوين الصفحة الرئيسية
  const sizes = {
    sm: "text-base md:text-lg",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-4xl md:text-5xl",
    xxl: "text-5xl md:text-6xl",
    xxxl: "text-6xl md:text-7xl",
  };
  const variants = {
    black: "ds-text-primary",
    gray: "ds-text-secondary",
    primary: "ds-text-alt",
    inverse: "ds-text-inverse", // للأقسام الداكنة
    gold: "ds-text-gold", // تدرج ذهبي: للعنوان الرئيسي فقط
    disabled: "ds-text-disabled",
  };
  return (
    <>
      <h2
        className={cn(
          "ds-font-heading leading-[1.2] text-balance",
          sizes[size],
          variants[variant],
          center ? "text-center" : "",
          className,
        )}
      >
        {children}
      </h2>
    </>
  );
}