"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import Title from "@/components/atoms/Title";
import Text from "@/components/atoms/Text";
import Button from "@/components/atoms/Button";
import AuthField from "@/components/auth/AuthField";
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
    register, handleSubmit, watch, setError, setFocus,
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

  const checks = getPasswordChecks(watch("password") ?? "");
  const score = Object.values(checks).filter(Boolean).length;
  const barColor = score <= 1 ? "bg-red-500" : score < 4 ? "bg-amber-500" : "ds-bg-primary";
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
    <div className="flex min-h-screen items-center justify-center ds-bg-alt px-4 py-10">
      <div className="w-full max-w-md ds-bg ds-rounded-xl ds-shadow-md p-6 sm:p-8">
        <Title size="lg" center>{t("title")}</Title>
        <Text size="sm" variant="disabled" center>{t("subtitle")}</Text>

        {formError && (
          <div role="alert" className="mt-5 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          <AuthField
            label={t("fields.name")} placeholder={t("placeholders.name")}
            autoComplete="name" error={errors.name?.message} {...register("name")}
          />
          <AuthField
            label={t("fields.email")} placeholder="name@example.com" type="email" dir="ltr"
            autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")}
          />
          <div>
            <AuthField
              label={t("fields.password")} type="password" dir="ltr" autoComplete="new-password"
              toggleLabels={toggleLabels} error={errors.password?.message} {...register("password")}
            />
            <div className="mt-3" aria-live="polite">
              <div className="flex gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? barColor : "ds-bg-form"}`} />
                ))}
              </div>
              <p className="mt-1.5 text-xs ds-text-secondary">{t("strength.label")}: {strengthLabel}</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {(["length", "lower", "upper", "digit"] as const).map((k) => (
                  <li key={k} className={`flex items-center gap-1.5 text-xs ${checks[k] ? "ds-text-alt" : "ds-text-secondary"}`}>
                    {checks[k] ? <Check size={14} /> : <X size={14} />}
                    {t(`rules.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AuthField
            label={t("fields.confirmPassword")} type="password" dir="ltr" autoComplete="new-password"
            toggleLabels={toggleLabels} error={errors.confirmPassword?.message} {...register("confirmPassword")}
          />

          <Button type="submit" fullWidth loading={isSubmitting} size="md">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" /> {t("submitting")}
              </span>
            ) : (
              t("submit")
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm ds-text-secondary">
          {t("haveAccount")}{" "}
          <Link href={loginHref} className="font-semibold ds-text-alt hover:underline">{t("loginLink")}</Link>
        </p>
      </div>
    </div>
  );
}