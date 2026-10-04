// src/app/(auth)/forgot-password/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}