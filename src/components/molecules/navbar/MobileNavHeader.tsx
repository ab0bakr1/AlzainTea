import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import NavLogo from "@/components/atoms/navbar/NavLogo";
import NavIconButton from "@/components/atoms/navbar/NavIconButton";

export default function MobileNavHeader({ onClose }: { onClose: () => void }) {
  const t = useTranslations("nav");

  return (
    <div className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--color-glass-border)] px-4">
      <NavLogo size="lg" />
      <NavIconButton onClick={onClose} label={t("closeMenu")}>
        <X aria-hidden size={28} />
      </NavIconButton>
    </div>
  );
}