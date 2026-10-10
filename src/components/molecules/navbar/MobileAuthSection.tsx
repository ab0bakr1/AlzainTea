// src/components/molecules/navbar/MobileAuthSection.tsx
// منطقة المصادقة داخل قائمة الجوال

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { getInitials, useAuthActions } from "@/hooks/useAuthActions";
import { useAccountLinks } from "./account-links";
import { btnOutline, btnPrimary, btnSizeMobile, menuItemBase } from "./auth-styles";

export default function MobileAuthSection({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("nav");
  const { isLoading, isAuthenticated, user, isAdmin, loginHref, registerHref, logout, isLoggingOut } =
    useAuthActions();
  const links = useAccountLinks(isAdmin);

  if (isLoading) {
    return (
      <div className="px-4" aria-hidden>
        <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--color-form)] motion-reduce:animate-none" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col gap-3 px-4">
        <Link href={loginHref} onClick={onNavigate} className={cn(btnOutline, btnSizeMobile)}>
          {t("login")}
        </Link>
        <Link href={registerHref} onClick={onNavigate} className={cn(btnPrimary, btnSizeMobile)}>
          {t("register")}
        </Link>
      </div>
    );
  }

  const displayName = user.name?.trim() || user.email || "";

  const handleLogout = () => {
    onNavigate();
    void logout();
  };

  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-bg-alt)] p-3">
        <span
          aria-hidden
          className="ds-bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        >
          {getInitials(user.name, user.email)}
        </span>
        <div className="min-w-0">
          <p className="ds-text-primary truncate text-base font-bold">{displayName}</p>
          {user.email && user.email !== displayName && (
            <p className="ds-text-secondary truncate text-sm">{user.email}</p>
          )}
        </div>
      </div>

      <ul className="mt-2 flex flex-col">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={cn(menuItemBase, "ds-text-primary text-base")}
            >
              <Icon aria-hidden size={20} className="ds-text-secondary" />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={cn(menuItemBase, "mt-1 text-base text-red-600 disabled:opacity-60 dark:text-red-400")}
      >
        <LogOut aria-hidden size={20} />
        {isLoggingOut ? t("loggingOut") : t("logout")}
      </button>
    </div>
  );
}