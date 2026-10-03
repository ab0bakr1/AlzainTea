// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function LoginPage() {
  // useSearchParams داخل LoginForm يتطلب Suspense في Next.js 15/16
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}