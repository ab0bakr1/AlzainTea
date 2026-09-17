import { cn } from "@/lib/cn";
interface Props {
  size?: number;
  color?: "black" | "disabled";
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
    disabled: "ds-text-disabled",
  };
  return <IconComponent size={size} className={cn(colors[color], className)} />;
}
