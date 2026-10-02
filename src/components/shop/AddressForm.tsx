"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/atoms/Button";
import { cn } from "@/lib/cn";
import type { Address, AddressPayload } from "@/services/addresses";
import { COUNTRY_CODES, countryName, useAccountText } from "./account-i18n";

interface Props {
  initial?: Address;
  isFirstAddress?: boolean;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (payload: AddressPayload) => void;
  onCancel: () => void;
}

type Field = "fullName" | "phone" | "country" | "city" | "street";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2.5 text-base outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

export default function AddressForm({
  initial,
  isFirstAddress = false,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const { t, lang } = useAccountText();
  const [values, setValues] = useState({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    country: initial?.country ?? "",
    city: initial?.city ?? "",
    street: initial?.street ?? "",
    postalCode: initial?.postalCode ?? "",
    isDefault: initial?.isDefault ?? isFirstAddress,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const countries = COUNTRY_CODES.includes(values.country) || !values.country
    ? COUNTRY_CODES
    : [values.country, ...COUNTRY_CODES];

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate() {
    const e: Partial<Record<Field, string>> = {};
    if (values.fullName.trim().length < 2) e.fullName = t.vFullName;
    if (values.phone.trim().length < 6) e.phone = t.vPhone;
    if (values.country.length !== 2) e.country = t.vCountry;
    if (!values.city.trim()) e.city = t.vCity;
    if (!values.street.trim()) e.street = t.vStreet;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      country: values.country,
      city: values.city.trim(),
      street: values.street.trim(),
      postalCode: values.postalCode.trim() || undefined,
      isDefault: values.isDefault,
    });
  }

  const fieldWrap = (id: Field, label: string, children: React.ReactNode) => (
    <div>
      <label htmlFor={`addr-${id}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {errors[id] && (
        <p id={`addr-${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors[id]}
        </p>
      )}
    </div>
  );

  const aria = (id: Field) => ({
    id: `addr-${id}`,
    "aria-invalid": !!errors[id],
    "aria-describedby": errors[id] ? `addr-${id}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {fieldWrap(
        "fullName",
        t.fullName,
        <input
          {...aria("fullName")}
          autoComplete="name"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className={cn(inputClass, errors.fullName && "border-red-500")}
        />,
      )}

      {fieldWrap(
        "phone",
        t.phone,
        <input
          {...aria("phone")}
          type="tel"
          dir="ltr"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={cn(inputClass, "text-start", errors.phone && "border-red-500")}
        />,
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {fieldWrap(
          "country",
          t.country,
          <select
            {...aria("country")}
            autoComplete="country"
            value={values.country}
            onChange={(e) => set("country", e.target.value)}
            className={cn(inputClass, "bg-white dark:bg-zinc-900", errors.country && "border-red-500")}
          >
            <option value="" disabled>
              —
            </option>
            {countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code, lang)}
              </option>
            ))}
          </select>,
        )}

        {fieldWrap(
          "city",
          t.city,
          <input
            {...aria("city")}
            autoComplete="address-level2"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            className={cn(inputClass, errors.city && "border-red-500")}
          />,
        )}
      </div>

      {fieldWrap(
        "street",
        t.street,
        <input
          {...aria("street")}
          autoComplete="street-address"
          placeholder={t.streetHint}
          value={values.street}
          onChange={(e) => set("street", e.target.value)}
          className={cn(inputClass, errors.street && "border-red-500")}
        />,
      )}

      <div>
        <label htmlFor="addr-postalCode" className="mb-1.5 block text-sm font-medium">
          {t.postalCode} <span className="font-normal text-zinc-500">({t.optional})</span>
        </label>
        <input
          id="addr-postalCode"
          dir="ltr"
          autoComplete="postal-code"
          value={values.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
          className={cn(inputClass, "text-start sm:max-w-[50%]")}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4 accent-current"
        />
        {t.makeDefault}
      </label>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-500/15 dark:text-red-300">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="cursor-pointer rounded-md px-4 py-2 text-base text-zinc-600 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.cancel}
        </button>
        <Button type="submit" size="md" loading={submitting}>
          {submitting ? t.saving : initial ? t.saveChanges : t.save}
        </Button>
      </div>
    </form>
  );
}