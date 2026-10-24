import Link from "next/link";
import { useTranslations } from "next-intl";

interface Props {
  size?: "sm" | "lg";
}

export default function NavLogo({ size = "sm" }: Props) {
  const t = useTranslations("brand");

  return (
    <Link
      href="/"
      className={`ds-font-heading font-bold text-[#f0e6d3] transition-opacity duration-200 hover:opacity-80 focus-visible:opacity-80 ${
        size === "lg" ? "text-5xl" : "text-3xl"
      }`}
    >
      {t("name")}
    </Link>
  );
}