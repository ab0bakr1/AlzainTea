// src/hooks/useAuthActions.ts
// منطق المصادقة المشترك لأجزاء الهيدر (Desktop + Mobile):
// حالة الجلسة، رابط الدخول مع callbackUrl، وتسجيل الخروج المتكامل مع السلة والكاش.

"use client";

import { useCallback, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// صفحات المصادقة: لا نمرر callbackUrl منها لتفادي حلقات التوجيه
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

/** الحرفان الأولان من أول كلمتين في الاسم (يدعم العربية والإيموجي عبر Array.from) */
export function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

export function useAuthActions() {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = session?.user ?? null;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const loginHref =
    isAuthPage || pathname === "/"
      ? "/login"
      : `/login?callbackUrl=${encodeURIComponent(pathname)}`;

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // redirect:false → تتغير الجلسة داخل SessionProvider فيتولى
      // useCartAuthSync استدعاء switchToGuestCart() تلقائياً
      await signOut({ redirect: false });
      router.replace("/");
      router.refresh();
      // مسح كاش React Query (طلبات/مفضلة/عناوين المستخدم السابق) حتى لا تظهر لمستخدم آخر
      queryClient.clear();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router, queryClient]);

  return {
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated" && !!user,
    user,
    isAdmin,
    loginHref,
    registerHref: "/register",
    logout,
    isLoggingOut,
  };
}