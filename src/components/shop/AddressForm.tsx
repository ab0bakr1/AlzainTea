// src/components/shop/AddressForm.tsx
// نموذج عنوان مشترك بين صفحة الدفع (AddressStep) وصفحة الحساب (AddressesManager).
// الدولة هنا حالة محلية للنموذج نفسه، ولا ترتبط بدولة الدفع العامة.

"use client";

import { useState } from "react";
import { SUPPORTED_COUNTRIES, getCountryByCode } from "@/lib/shipping-rates";
import { getApiErrorMessage, type AddressPayload } from "@/services/addresses";

export type AddressFieldsValue = {
  fullName: string;
  phone: string;
  city: string;
  street: string;
  postalCode: string;
};

export type FieldErrors = Partial<Record<keyof AddressFieldsValue | "email", string>>;

export const EMPTY_FIELDS: AddressFieldsValue = {
  fullName: "",
  phone: "",
  city: "",
  street: "",
  postalCode: "",
};

// نفس قواعد address.validators.ts / checkout.validators.ts
export function validateAddressFields(v: AddressFieldsValue): FieldErrors {
  const errors: FieldErrors = {};
  if (v.fullName.trim().length < 2) errors.fullName = "الاسم الكامل مطلوب";
  if (v.phone.trim().length < 6) errors.phone = "رقم الهاتف غير صالح";
  if (!v.city.trim()) errors.city = "المدينة مطلوبة";
  if (!v.street.trim()) errors.street = "العنوان مطلوب";
  return errors;
}

export const inputClass = "w-full px-4 py-2 rounded-xl border bg-background text-sm";

export function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  autoComplete?: string;
  optional?: boolean;
}) {
  const { id, label, value, onChange, error, type = "text", dir, autoComplete, optional } = props;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted-foreground font-normal"> (اختياري)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        dir={dir}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} ${error ? "border-red-500" : ""}`}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function CountrySelect(props: {
  id?: string;
  label?: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const { id = "address-country", label = "دولة الشحن", value, onChange } = props;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {SUPPORTED_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {getCountryByCode(code)?.nameAr ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AddressFields(props: {
  idPrefix: string;
  value: AddressFieldsValue;
  onChange: (patch: Partial<AddressFieldsValue>) => void;
  errors: FieldErrors;
}) {
  const { idPrefix, value, onChange, errors } = props;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={`${idPrefix}-name`}
        label="الاسم الكامل"
        value={value.fullName}
        onChange={(v) => onChange({ fullName: v })}
        error={errors.fullName}
        autoComplete="name"
      />
      <TextField
        id={`${idPrefix}-phone`}
        label="رقم الجوال"
        value={value.phone}
        onChange={(v) => onChange({ phone: v })}
        error={errors.phone}
        type="tel"
        dir="ltr"
        autoComplete="tel"
      />
      <TextField
        id={`${idPrefix}-city`}
        label="المدينة"
        value={value.city}
        onChange={(v) => onChange({ city: v })}
        error={errors.city}
        autoComplete="address-level2"
      />
      <TextField
        id={`${idPrefix}-postal`}
        label="الرمز البريدي"
        value={value.postalCode}
        onChange={(v) => onChange({ postalCode: v })}
        dir="ltr"
        autoComplete="postal-code"
        optional
      />
      <div className="sm:col-span-2">
        <TextField
          id={`${idPrefix}-street`}
          label="العنوان (الحي، الشارع، رقم المبنى)"
          value={value.street}
          onChange={(v) => onChange({ street: v })}
          error={errors.street}
          autoComplete="street-address"
        />
      </div>
    </div>
  );
}

type AddressFormProps = {
  idPrefix: string;
  title: string;
  /** قيم ابتدائية (للتعديل). */
  initial?: Partial<AddressFieldsValue> & { country?: string; isDefault?: boolean };
  /** الدولة الابتدائية عند الإضافة. */
  defaultCountry: string;
  submitLabel: string;
  showDefaultToggle?: boolean;
  onSubmit: (payload: AddressPayload) => Promise<void>;
  onCancel: () => void;
};

export default function AddressForm(props: AddressFormProps) {
  const { idPrefix, title, initial, defaultCountry, submitLabel, showDefaultToggle, onSubmit, onCancel } = props;

  const [fields, setFields] = useState<AddressFieldsValue>({ ...EMPTY_FIELDS, ...initial });
  const [country, setCountry] = useState(initial?.country ?? defaultCountry);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const found = validateAddressFields(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        fullName: fields.fullName.trim(),
        phone: fields.phone.trim(),
        city: fields.city.trim(),
        street: fields.street.trim(),
        // "" عمداً: يسمح بمسح الرمز البريدي عند التعديل (يُخزَّن null في الخادم)
        postalCode: fields.postalCode.trim(),
        country,
        isDefault,
      });
    } catch (e) {
      setError(getApiErrorMessage(e, "تعذّر حفظ العنوان، حاول مرة أخرى"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 rounded-xl border space-y-4">
      <h3 className="font-semibold">{title}</h3>

      <CountrySelect id={`${idPrefix}-country`} value={country} onChange={setCountry} />

      <AddressFields
        idPrefix={idPrefix}
        value={fields}
        onChange={(p) => setFields((f) => ({ ...f, ...p }))}
        errors={errors}
      />

      {showDefaultToggle && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="accent-primary"
          />
          تعيين كعنوان افتراضي
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2 rounded-xl border text-sm">
          إلغاء
        </button>
      </div>
    </div>
  );
}