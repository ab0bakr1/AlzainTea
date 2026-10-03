// src/app/(auth)/register/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function RegisterPage() {
  // useSearchParams داخل RegisterForm يتطلب Suspense
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}