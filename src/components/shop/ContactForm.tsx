// src/components/shop/ContactForm.tsx
// نموذج التواصل — واجهة فقط (لا يتصل بأي API). كل النصوص من namespace: "contact".
"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

type Field = "name" | "email" | "subject" | "message";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, "required" | "email">>;

const EMPTY: Values = { name: "", email: "", subject: "", message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const labelCls = "mb-2 block text-sm font-semibold text-[var(--color-text-primary)]";
const errorCls = "mt-2 text-sm text-[var(--color-danger)]";

export default function ContactForm() {
  const t = useTranslations("contact");
  const uid = useId();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const setField = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Errors = {};
    (Object.keys(values) as Field[]).forEach((k) => {
      if (!values[k].trim()) next[k] = "required";
    });
    if (!next.email && !EMAIL_RE.test(values.email.trim())) next.email = "email";

    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setSent(false);
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center px-4 py-10 text-center">
        <span
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]"
        >
          <CheckCircle2 size={32} />
        </span>
        <h3 className="mt-6 text-2xl font-bold">{t("sentTitle")}</h3>
        <p className="mt-3 max-w-sm leading-8 text-[var(--color-text-secondary)]">{t("sentSuccess")}</p>
        <button type="button" onClick={reset} className="ds-btn ds-btn-outline mt-8 px-8">
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const fieldProps = (field: Field) => ({
    id: `${uid}-${field}`,
    name: field,
    value: values[field],
    onChange: (e: { target: { value: string } }) => setField(field, e.target.value),
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby": errors[field] ? `${uid}-${field}-err` : undefined,
  });

  const err = (field: Field) =>
    errors[field] ? (
      <p id={`${uid}-${field}-err`} role="alert" className={errorCls}>
        {errors[field] === "email" ? t("errorEmail") : t("errorRequired")}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelCls}>
            {t("name")}
          </label>
          <input type="text" autoComplete="name" className="ds-input" {...fieldProps("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelCls}>
            {t("email")}
          </label>
          <input
            type="email"
            autoComplete="email"
            dir="ltr"
            className="ds-input text-start"
            {...fieldProps("email")}
          />
          {err("email")}
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-subject`} className={labelCls}>
          {t("subject")}
        </label>
        <input type="text" className="ds-input" {...fieldProps("subject")} />
        {err("subject")}
      </div>

      <div>
        <label htmlFor={`${uid}-message`} className={labelCls}>
          {t("message")}
        </label>
        <textarea rows={6} className="ds-input min-h-40 resize-y py-3 leading-7" {...fieldProps("message")} />
        {err("message")}
      </div>

      <div>
        <button
          type="submit"
          className="ds-btn ds-btn-primary min-h-[52px] w-full px-10 text-lg hover:-translate-y-px md:w-auto"
        >
          {t("send")}
        </button>
      </div>
    </form>
  );
}