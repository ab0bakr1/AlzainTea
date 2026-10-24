// src/components/auth/ForgotPasswordForm.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import AuthField from "@/components/auth/AuthField";
import AuthShell, { AuthAlert, authLink } from "@/components/auth/AuthShell";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/modules/auth/auth.validators";
import { forgotPasswordRequest, parseApiError } from "@/services/auth.service";

const RESEND_SECONDS = 60;
const TOKEN_MINUTES = 30; // يطابق RESET_TOKEN_TTL_MINUTES في الخادم

type FormError = "unavailable" | "generic" | null;

export default function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const tBrand = useTranslations("brand");
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
    <AuthAlert>{formError === "unavailable" ? t("errors.unavailable") : t("errors.generic")}</AuthAlert>
  );

  const footer = (
    <Link href="/login" className={authLink}>
      {t("backToLogin")}
    </Link>
  );

  if (sentTo) {
    return (
      <AuthShell
        brand={tBrand("name")}
        icon={<MailCheck className="size-8" />}
        title={t("sent.title")}
        subtitle={t("sent.description", { email: sentTo })}
        footer={footer}
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("sent.hint", { minutes: TOKEN_MINUTES })}
          </p>
          {errorBox}
          <AuthButton
            type="button"
            loading={resending}
            disabled={cooldown > 0 || resending}
            onClick={onResend}
          >
            {cooldown > 0 ? t("sent.resendIn", { seconds: cooldown }) : t("sent.resend")}
          </AuthButton>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setFormError(null);
            }}
            className={`${authLink} cursor-pointer text-sm`}
          >
            {t("sent.changeEmail")}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      brand={tBrand("name")}
      icon={<KeyRound className="size-8" />}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errorBox}
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
        <AuthButton type="submit" loading={isSubmitting} className="mt-2">
          {isSubmitting ? t("submitting") : t("submit")}
        </AuthButton>
      </form>
    </AuthShell>
  );
}