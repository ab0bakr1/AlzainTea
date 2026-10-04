// src/components/auth/ResetPasswordForm.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Circle, Eye, EyeOff, Leaf, Lock, ShieldAlert } from "lucide-react";
import Button from "@/components/atoms/Button";
import Text from "@/components/atoms/Text";
import Title from "@/components/atoms/Title";
import { cn } from "@/lib/cn";
import {
  defaultRegisterMessages,
  getPasswordChecks,
  makeResetPasswordFormSchema,
  type ResetPasswordFormInput,
  type ResetPasswordFormOutput,
} from "@/modules/auth/auth.validators";
import { parseApiError, resetPasswordRequest } from "@/services/auth.service";

type FormError = "unavailable" | "generic" | null;

const inputClass = (hasError: boolean) =>
  cn(
    "h-12 w-full rounded-[var(--radius-lg)] border bg-[var(--color-form)] ps-11 pe-11 text-base",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]",
    "outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]",
    hasError ? "border-red-500" : "border-transparent",
  );

export default function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const checks = getPasswordChecks(watch("password") ?? "");

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

  if (tokenInvalid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-alt)] px-4 py-10">
        <div className="w-full max-w-md space-y-4 rounded-[var(--radius-2xl)] bg-[var(--color-bg)] p-6 text-center shadow-[var(--shadow-md)] sm:p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <Title size="lg" center>
            {t("invalid.title")}
          </Title>
          <Text variant="disabled" size="sm" center>
            {t("invalid.description")}
          </Text>
          <Link href="/forgot-password" className="block">
            <Button type="button" size="md" fullWidth>
              {t("invalid.requestNew")}
            </Button>
          </Link>
          <Link href="/login" className="inline-block text-sm text-[var(--color-primary)] hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </main>
    );
  }

  const checkItems: Array<[keyof typeof checks, string]> = [
    ["length", t("checks.length")],
    ["lower", t("checks.lower")],
    ["upper", t("checks.upper")],
    ["digit", t("checks.digit")],
  ];

  const field = (
    id: "password" | "confirmPassword",
    label: string,
    placeholder: string,
    autoFocus = false,
  ) => {
    const err = errors[id]?.message;
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--color-text-disabled)]"
            aria-hidden
          />
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-invalid={!!err}
            aria-describedby={err ? `${id}-error` : undefined}
            className={inputClass(!!err)}
            {...register(id)}
          />
          {id === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          )}
        </div>
        {err && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-500">
            {String(err)}
          </p>
        )}
      </div>
    );
  };

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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{formError === "unavailable" ? t("errors.unavailable") : t("errors.generic")}</span>
            </div>
          )}

          {field("password", t("password"), t("passwordPlaceholder"), true)}

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-live="polite">
            {checkItems.map(([key, label]) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-1.5",
                  checks[key] ? "text-[var(--color-primary)]" : "text-[var(--color-text-disabled)]",
                )}
              >
                {checks[key] ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                {label}
              </li>
            ))}
          </ul>

          {field("confirmPassword", t("confirmPassword"), t("confirmPlaceholder"))}

          <Button type="submit" size="md" fullWidth loading={busy} className="mt-2">
            {busy ? t("submitting") : t("submit")}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </main>
  );
}