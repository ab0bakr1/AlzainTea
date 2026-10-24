import { cn } from "@/lib/cn";
interface Props {
  size?: number;
  color?: "black" | "accent" | "muted" | "inverse" | "disabled";
  className?: string;
  IconComponent: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}
export default function Icon({
  IconComponent,
  color = "black",
  size,
  className,
}: Props) {
  const colors = {
    black: "ds-text-primary",
    accent: "ds-text-alt", // ذهبي (مثل أيقونات "لماذا الزين")
    muted: "ds-text-secondary",
    inverse: "ds-text-inverse", // فوق الخلفيات الداكنة
    disabled: "ds-text-disabled",
  };
  return (
    <IconComponent
      size={size}
      className={cn("shrink-0", colors[color], className)}
    />
  );
}