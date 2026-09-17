import { cn } from "@/lib/cn";
interface Props {
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  center?: boolean;
  variant?: "primary" | "disabled";
  className?: string;
}

export default function Text({
  children,
  size = "md",
  center = false,
  variant = "primary",
  className = "pt-2.5 capitalize font-normal",
}: Props) {
  const sizes = {
    sm: "ds-text-sm",
    md: "ds-text-base",
    lg: "ds-text-lg",
  };
  const variants = {
    primary: "ds-text-primary",
    disabled: "ds-text-disabled",
  };

  return (
    <>
      <p
        className={cn(
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
