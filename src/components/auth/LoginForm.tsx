// src/components/auth/LoginForm.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Leaf, Lock, Mail } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import AuthField from "@/components/auth/AuthField";
import AuthShell, { AuthAlert, authLink } from "@/components/auth/AuthShell";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
import { loginSchema, type LoginInput } from "@/modules/auth/auth.validators";

type FormError = "invalid" | "unavailable" | null;

export default function LoginForm() {
  const t = useTranslations("auth.login");
  const tBrand = useTranslations("brand");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [formError, setFormError] = useState<FormError>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const role = session?.user?.role;
  const isAuthenticated = status === "authenticated";

  // يخدم الحالتين: مستخدم مسجّل أصلاً يزور /login، أو دخول ناجح للتو.
  // دمج السلة يتم تلقائياً في useCartAuthSync — لا نستدعيه هنا لتفادي الدمج المزدوج.
  useEffect(() => {
    if (!isAuthenticated) return;
    const fallback = role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/";
    router.replace(callbackUrl ?? fallback);
    router.refresh();
  }, [isAuthenticated, role, callbackUrl, router]);

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!res || res.error) {
        setFormError("invalid");
        return;
      }
      setRedirecting(true); // نُبقي الزر في حالة تحميل حتى يكتمل التحويل
    } catch {
      // عند تجاوز حد المعدل (429 من الـ Middleware) يرجع JSON بدون url فيرمي signIn استثناءً
      setFormError("unavailable");
    }
  };

  const busy = isSubmitting || redirecting;
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <AuthShell
      brand={tBrand("name")}
      icon={<Leaf className="size-8" />}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          <p className="text-[var(--color-text-secondary)]">
            {t("noAccount")}{" "}
            <Link href={registerHref} className={authLink}>
              {t("createAccount")}
            </Link>
          </p>
          <Link
            href="/"
            className="inline-block text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
          >
            {t("continueAsGuest")}
          </Link>
        </>
      }
    >
      {isAuthenticated ? (
        <p className="text-center text-[var(--color-text-secondary)]" role="status">
          {t("redirecting")}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {formError && (
            <AuthAlert>
              {formError === "invalid" ? t("errors.invalidCredentials") : t("errors.unavailable")}
            </AuthAlert>
          )}

          <AuthField
            label={t("email")}
            type="email"
            dir="ltr"
            inputMode="email"
            autoComplete="email"
            autoFocus
            icon={<Mail />}
            placeholder={t("emailPlaceholder")}
            error={errors.email ? t("errors.emailInvalid") : undefined}
            {...register("email")}
          />

          <AuthField
            label={t("password")}
            type="password"
            dir="ltr"
            autoComplete="current-password"
            icon={<Lock />}
            placeholder={t("passwordPlaceholder")}
            toggleLabels={{ show: t("showPassword"), hide: t("hidePassword") }}
            labelAside={
              <Link href="/forgot-password" className={`${authLink} text-sm`}>
                {t("forgotPassword")}
              </Link>
            }
            error={errors.password ? t("errors.passwordRequired") : undefined}
            {...register("password")}
          />

          <AuthButton type="submit" loading={busy} className="mt-2">
            {busy ? t("submitting") : t("submit")}
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}