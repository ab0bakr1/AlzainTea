"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, User, UserPlus } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import AuthField from "@/components/auth/AuthField";
import AuthShell, { AuthAlert, AuthRules, authLink } from "@/components/auth/AuthShell";
import {
  getPasswordChecks,
  makeRegisterFormSchema,
  type RegisterFormInput,
  type RegisterFormOutput,
} from "@/modules/auth/auth.validators";
import { parseApiError, registerRequest } from "@/services/auth.service";

/** يمنع Open Redirect: مسارات داخلية فقط، ولا نعيد المستخدم لصفحات المصادقة */
function safeCallbackUrl(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.startsWith("/login") || raw.startsWith("/register")) return "/";
  return raw;
}

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const tBrand = useTranslations("brand");
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      makeRegisterFormSchema({
        nameMin: t("validation.nameMin"),
        nameMax: t("validation.nameMax"),
        emailInvalid: t("validation.emailInvalid"),
        passwordMin: t("validation.passwordMin"),
        passwordMax: t("validation.passwordMax"),
        passwordLower: t("validation.passwordLower"),
        passwordUpper: t("validation.passwordUpper"),
        passwordDigit: t("validation.passwordDigit"),
        confirmRequired: t("validation.confirmRequired"),
        passwordMismatch: t("validation.passwordMismatch"),
      }),
    [t],
  );

  const {
    register, handleSubmit, control, setError, setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // مستخدم مسجّل أصلاً لا حاجة له بهذه الصفحة
  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  const password = useWatch({ control, name: "password" });
  const checks = getPasswordChecks(password ?? "");
  const score = Object.values(checks).filter(Boolean).length;
  const barColor =
    score <= 1
      ? "bg-[var(--color-danger)]"
      : score < 4
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-primary)]";
  const strengthLabel = score <= 1 ? t("strength.weak") : score < 4 ? t("strength.medium") : t("strength.strong");

  const onSubmit = async (values: RegisterFormOutput) => {
    setFormError(null);
    try {
      await registerRequest(values);
    } catch (err) {
      const { status: httpStatus } = parseApiError(err);
      if (httpStatus === 409) {
        setError("email", { message: t("errors.emailTaken") });
        setFocus("email");
      } else if (httpStatus === 429) {
        setFormError(t("errors.tooMany"));
      } else {
        setFormError(t("errors.generic"));
      }
      return;
    }

    // دخول تلقائي. دمج سلة الزائر يتولاه useCartAuthSync عند تغيّر الجلسة (لا نستدعيه هنا لتفادي الدمج المزدوج)
    const res = await signIn("credentials", { email: values.email, password: values.password, redirect: false });
    if (res?.error) {
      router.replace(`/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  };

  const toggleLabels = { show: t("showPassword"), hide: t("hidePassword") };
  const loginHref = callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <AuthShell
      brand={tBrand("name")}
      icon={<UserPlus className="size-8" />}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p className="text-[var(--color-text-secondary)]">
          {t("haveAccount")}{" "}
          <Link href={loginHref} className={authLink}>
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <AuthAlert>{formError}</AuthAlert>}

        <AuthField
          label={t("fields.name")}
          placeholder={t("placeholders.name")}
          autoComplete="name"
          icon={<User />}
          error={errors.name?.message}
          {...register("name")}
        />
        <AuthField
          label={t("fields.email")}
          placeholder={t("placeholders.email")}
          type="email"
          dir="ltr"
          autoComplete="email"
          inputMode="email"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <AuthField
            label={t("fields.password")}
            placeholder={t("placeholders.password")}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            icon={<Lock />}
            toggleLabels={toggleLabels}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="mt-3 space-y-2.5" aria-live="polite">
            <div className="flex gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i <= score ? barColor : "bg-[var(--border-color)]"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("strength.label")}: {strengthLabel}
            </p>
            <AuthRules
              items={(["length", "lower", "upper", "digit"] as const).map((k) => ({
                ok: checks[k],
                label: t(`rules.${k}`),
              }))}
            />
          </div>
        </div>

        <AuthField
          label={t("fields.confirmPassword")}
          placeholder={t("placeholders.confirmPassword")}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          icon={<Lock />}
          toggleLabels={toggleLabels}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <AuthButton type="submit" loading={isSubmitting} className="mt-2">
          {isSubmitting ? t("submitting") : t("submit")}
        </AuthButton>
      </form>
    </AuthShell>
  );
}