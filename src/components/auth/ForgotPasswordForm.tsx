// src/components/auth/ForgotPasswordForm.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, KeyRound, Mail, MailCheck } from "lucide-react";
import Button from "@/components/atoms/Button";
import Text from "@/components/atoms/Text";
import Title from "@/components/atoms/Title";
import { cn } from "@/lib/cn";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/modules/auth/auth.validators";
import { forgotPasswordRequest, parseApiError } from "@/services/auth.service";

const RESEND_SECONDS = 60;
const TOKEN_MINUTES = 30; // يطابق RESET_TOKEN_TTL_MINUTES في الخادم

type FormError = "unavailable" | "generic" | null;

const inputClass = (hasError: boolean) =>
  cn(
    "h-12 w-full rounded-[var(--radius-lg)] border bg-[var(--color-form)] ps-11 pe-4 text-base",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]",
    "outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]",
    hasError ? "border-red-500" : "border-transparent",
  );

export default function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<FormError>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = async (email: string) => {
    setFormError(null);
    try {
      await forgotPasswordRequest(email);
      setSentTo(email);
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      setFormError(parseApiError(error).status === 429 ? "unavailable" : "generic");
    }
  };

  const onSubmit = (values: ForgotPasswordInput) => send(values.email);

  const onResend = async () => {
    if (!sentTo || cooldown > 0) return;
    setResending(true);
    await send(sentTo);
    setResending(false);
  };

  const errorBox = formError && (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{formError === "unavailable" ? t("errors.unavailable") : t("errors.generic")}</span>
    </div>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-alt)] px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-2xl)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-md)] sm:p-8">
        {sentTo ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-200)] text-[var(--color-primary)]">
              <MailCheck className="size-7" aria-hidden />
            </span>
            <Title size="lg" center>
              {t("sent.title")}
            </Title>
            <Text variant="disabled" size="sm" center>
              {t("sent.description", { email: sentTo })}
            </Text>
            <Text variant="disabled" size="sm" center>
              {t("sent.hint", { minutes: TOKEN_MINUTES })}
            </Text>
            {errorBox}
            <Button
              type="button"
              size="md"
              fullWidth
              loading={resending}
              disabled={cooldown > 0 || resending}
              onClick={onResend}
            >
              {cooldown > 0 ? t("sent.resendIn", { seconds: cooldown }) : t("sent.resend")}
            </Button>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setFormError(null);
              }}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {t("sent.changeEmail")}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-200)] text-[var(--color-primary)]">
                <KeyRound className="size-7" aria-hidden />
              </span>
              <Title size="lg" center>
                {t("title")}
              </Title>
              <Text variant="disabled" size="sm" center>
                {t("subtitle")}
              </Text>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {errorBox}
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

              <Button type="submit" size="md" fullWidth loading={isSubmitting} className="mt-2">
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </main>
  );
}