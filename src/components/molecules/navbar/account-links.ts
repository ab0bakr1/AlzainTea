// src/components/molecules/navbar/account-links.ts
// روابط حساب المستخدم (تُستخدم في القائمة المنسدلة وقائمة الجوال)

import { useTranslations } from "next-intl";
import { Heart, LayoutDashboard, Package, UserRound, type LucideIcon } from "lucide-react";

export interface AccountLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function useAccountLinks(isAdmin: boolean): AccountLink[] {
  const t = useTranslations("nav");

  return [
    { href: "/account", label: t("account"), icon: UserRound },
    { href: "/account/orders", label: t("orders"), icon: Package },
    { href: "/account/wishlist", label: t("wishlist"), icon: Heart },
    ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: LayoutDashboard }] : []),
  ];
}