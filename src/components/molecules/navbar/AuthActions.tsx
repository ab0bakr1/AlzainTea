// src/components/molecules/navbar/AuthActions.tsx
// منطقة المصادقة في الهيدر (Desktop): تحميل ← زائر ← مستخدم مسجل

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useAuthActions } from "@/hooks/useAuthActions";
import UserMenu from "./UserMenu";
import { btnOutline, btnPrimary, btnSizeDesktop } from "./auth-styles";

export default function AuthActions() {
  const t = useTranslations("nav");
  const { isLoading, isAuthenticated, loginHref, registerHref } = useAuthActions();

  // Skeleton بعرض ثابت تقريباً لمنع قفز الهيدر وقت جلب الجلسة
  if (isLoading) {
    return (
      <div
        aria-hidden
        className="h-10 w-48 animate-pulse rounded-xl bg-[var(--color-form)] motion-reduce:animate-none"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href={loginHref} className={cn(btnOutline, btnSizeDesktop)}>
          {t("login")}
        </Link>
        <Link href={registerHref} className={cn(btnPrimary, btnSizeDesktop)}>
          {t("register")}
        </Link>
      </div>
    );
  }

  return <UserMenu />;
}