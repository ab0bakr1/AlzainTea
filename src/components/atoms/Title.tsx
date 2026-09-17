import { cn } from "@/lib/cn";
interface Props {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl";
  variant?: "black" | "gray" | "primary" | "disabled";
  center?: boolean;
  className?: string;
}
export default function Title({
  children,
  size = "md",
  variant = "black",
  center = false,
  className = "p-0 capitalize font-semibold",
}: Props) {
  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
    xxl: "text-5xl",
    xxxl: "text-6xl",
  };
  const variants = {
    black: "ds-text-primary",
    gray: "ds-text-secondary",
    primary: "ds-text-alt",
    disabled: "ds-text-disabled",
  };
  return (
    <>
      <h2
        className={cn(
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
