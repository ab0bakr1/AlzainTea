// src/components/auth/ResetPasswordForm.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Leaf, Lock, ShieldAlert } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import AuthField from "@/components/auth/AuthField";
import AuthShell, { AuthAlert, AuthRules, authLink } from "@/components/auth/AuthShell";
import {
  defaultRegisterMessages,
  getPasswordChecks,
  makeResetPasswordFormSchema,
  type ResetPasswordFormInput,
  type ResetPasswordFormOutput,
} from "@/modules/auth/auth.validators";
import { parseApiError, resetPasswordRequest } from "@/services/auth.service";

type FormError = "unavailable" | "generic" | null;

export default function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const tBrand = useTranslations("brand");
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [tokenInvalid, setTokenInvalid] = useState(!token);
  const [formError, setFormError] = useState<FormError>(null);
  const [redirecting, setRedirecting] = useState(false);

  const schema = useMemo(
    () =>
      makeResetPasswordFormSchema({
        ...defaultRegisterMessages,
        passwordMin: t("errors.passwordMin"),
        passwordMax: t("errors.passwordMax"),
        passwordLower: t("errors.passwordLower"),
        passwordUpper: t("errors.passwordUpper"),
        passwordDigit: t("errors.passwordDigit"),
        confirmRequired: t("errors.confirmRequired"),
        passwordMismatch: t("errors.passwordMismatch"),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = useWatch({ control, name: "password" });
  const checks = getPasswordChecks(password ?? "");

  const onSubmit = async (values: ResetPasswordFormOutput) => {
    setFormError(null);
    try {
      await resetPasswordRequest({ token, password: values.password });
      setRedirecting(true); // نُبقي الزر في حالة تحميل حتى يكتمل التحويل
      router.replace("/login?reset=success");
    } catch (error) {
      const { code, status } = parseApiError(error);
      if (code === "INVALID_RESET_TOKEN") setTokenInvalid(true);
      else setFormError(status === 429 ? "unavailable" : "generic");
    }
  };

  const busy = isSubmitting || redirecting;

  const footer = (
    <Link href="/login" className={authLink}>
      {t("backToLogin")}
    </Link>
  );

  if (tokenInvalid) {
    return (
      <AuthShell
        brand={tBrand("name")}
        tone="danger"
        icon={<ShieldAlert className="size-8" />}
        title={t("invalid.title")}
        subtitle={t("invalid.description")}
        footer={footer}
      >
        <Link href="/forgot-password" className="block">
          <span className="ds-btn ds-btn-primary min-h-[52px] w-full text-base hover:-translate-y-px">
            {t("invalid.requestNew")}
          </span>
        </Link>
      </AuthShell>
    );
  }

  const toggleLabels = { show: t("showPassword"), hide: t("hidePassword") };

  return (
    <AuthShell
      brand={tBrand("name")}
      icon={<Leaf className="size-8" />}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <AuthAlert>{formError === "unavailable" ? t("errors.unavailable") : t("errors.generic")}</AuthAlert>
        )}

        <AuthField
          label={t("password")}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          autoFocus
          icon={<Lock />}
          placeholder={t("passwordPlaceholder")}
          toggleLabels={toggleLabels}
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthRules
          items={[
            { ok: checks.length, label: t("checks.length") },
            { ok: checks.lower, label: t("checks.lower") },
            { ok: checks.upper, label: t("checks.upper") },
            { ok: checks.digit, label: t("checks.digit") },
          ]}
        />

        <AuthField
          label={t("confirmPassword")}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          icon={<Lock />}
          placeholder={t("confirmPlaceholder")}
          toggleLabels={toggleLabels}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <AuthButton type="submit" loading={busy} className="mt-2">
          {busy ? t("submitting") : t("submit")}
        </AuthButton>
      </form>
    </AuthShell>
  );
}