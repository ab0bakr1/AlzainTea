// src/components/auth/LoginForm.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Leaf, Lock, Mail } from "lucide-react";
import Button from "@/components/atoms/Button";
import Text from "@/components/atoms/Text";
import Title from "@/components/atoms/Title";
import { cn } from "@/lib/cn";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
import { loginSchema, type LoginInput } from "@/modules/auth/auth.validators";

type FormError = "invalid" | "unavailable" | null;

const inputClass = (hasError: boolean) =>
  cn(
    "h-12 w-full rounded-[var(--radius-lg)] border bg-[var(--color-form)] ps-11 pe-4 text-base",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]",
    "outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]",
    hasError ? "border-red-500" : "border-transparent",
  );

export default function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-alt)] px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-2xl)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-md)] sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-200)] text-[var(--color-primary)]">
            <Leaf className="size-7" aria-hidden />
          </span>
          <Title size="lg" center>
            {t("title")}
          </Title>
          <Text variant="disabled" size="sm" center>
            {t("subtitle")}
          </Text>
        </div>

        {isAuthenticated ? (
          <Text center>{t("redirecting")}</Text>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {formError === "invalid"
                    ? t("errors.invalidCredentials")
                    : t("errors.unavailable")}
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
              >
                {t("email")}
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-text-disabled)]"
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={t("emailPlaceholder")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={inputClass(!!errors.email)}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500">
                  {t("errors.emailInvalid")}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--color-text-primary)]"
                >
                  {t("password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-text-disabled)]"
                  aria-hidden
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("passwordPlaceholder")}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={cn(inputClass(!!errors.password), "pe-11")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden />
                  ) : (
                    <Eye className="size-5" aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-500">
                  {t("errors.passwordRequired")}
                </p>
              )}
            </div>

            <Button type="submit" size="md" fullWidth loading={busy} className="mt-2">
              {busy && (
                <span
                  className="me-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
              )}
              {busy ? t("submitting") : t("submit")}
            </Button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-[var(--color-text-secondary)]">
            {t("noAccount")}{" "}
            <Link href={registerHref} className="font-medium text-[var(--color-primary)] hover:underline">
              {t("createAccount")}
            </Link>
          </p>
          <Link href="/" className="inline-block text-[var(--color-text-disabled)] hover:underline">
            {t("continueAsGuest")}
          </Link>
        </div>
      </div>
    </main>
  );
}