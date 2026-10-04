// src/app/(auth)/reset-password/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function ResetPasswordPage() {
  // useSearchParams داخل ResetPasswordForm يتطلب Suspense
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}