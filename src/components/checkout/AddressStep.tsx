// src/components/checkout/AddressStep.tsx
// الخطوة 1: العنوان. المسجل يختار عنواناً محفوظاً أو يضيف جديداً، والزائر يدخل بريده وعنوانه.

"use client";

import { useState } from "react";
import { SUPPORTED_COUNTRIES, getCountryByCode } from "@/lib/shipping-rates";
import { parseApiError } from "@/services/checkout.service";
import type { NewAddressInput, SavedAddress } from "@/services/checkout.service";

export type AddressFieldsValue = {
  fullName: string;
  phone: string;
  city: string;
  street: string;
  postalCode: string;
};

export type GuestForm = AddressFieldsValue & { email: string };

type FieldErrors = Partial<Record<keyof AddressFieldsValue | "email", string>>;

// نفس قواعد address.validators.ts / checkout.validators.ts
export function validateAddressFields(v: AddressFieldsValue): FieldErrors {
  const errors: FieldErrors = {};
  if (v.fullName.trim().length < 2) errors.fullName = "الاسم الكامل مطلوب";
  if (v.phone.trim().length < 6) errors.phone = "رقم الهاتف غير صالح";
  if (!v.city.trim()) errors.city = "المدينة مطلوبة";
  if (!v.street.trim()) errors.street = "العنوان مطلوب";
  return errors;
}

export function validateGuestForm(v: GuestForm): FieldErrors {
  const errors = validateAddressFields(v);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
    errors.email = "أدخل بريداً إلكترونياً صحيحاً";
  }
  return errors;
}

export function isSupportedCountry(code: string) {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code);
}

const inputClass = "w-full px-4 py-2 rounded-xl border bg-background text-sm";

function TextField(props: {
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

function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor="checkout-country" className="text-sm font-medium">
        دولة الشحن
      </label>
      <select
        id="checkout-country"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {SUPPORTED_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {getCountryByCode(code)?.nameAr ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddressFields(props: {
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

const EMPTY_FIELDS: AddressFieldsValue = { fullName: "", phone: "", city: "", street: "", postalCode: "" };

type AddressStepProps = {
  isAuthenticated: boolean;
  countryCode: string;
  onCountryChange: (code: string) => void;
  showErrors: boolean;

  // مسجل
  addresses: SavedAddress[];
  addressesLoading: boolean;
  addressesError: boolean;
  onRetryAddresses: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddAddress: (input: NewAddressInput) => Promise<void>;

  // زائر
  guest: GuestForm;
  onGuestChange: (patch: Partial<GuestForm>) => void;
};

export default function AddressStep(props: AddressStepProps) {
  const {
    isAuthenticated,
    countryCode,
    onCountryChange,
    showErrors,
    addresses,
    addressesLoading,
    addressesError,
    onRetryAddresses,
    selectedId,
    onSelect,
    onAddAddress,
    guest,
    onGuestChange,
  } = props;

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<AddressFieldsValue>(EMPTY_FIELDS);
  const [draftErrors, setDraftErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveDraft() {
    const errors = validateAddressFields(draft);
    setDraftErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onAddAddress({
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
        city: draft.city.trim(),
        street: draft.street.trim(),
        postalCode: draft.postalCode.trim() || undefined,
        country: countryCode,
        isDefault: addresses.length === 0,
      });
      setDraft(EMPTY_FIELDS);
      setAdding(false);
    } catch (e) {
      setSaveError(parseApiError(e, "تعذّر حفظ العنوان").message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------- زائر
  if (!isAuthenticated) {
    const errors = showErrors ? validateGuestForm(guest) : {};
    return (
      <section className="space-y-5" aria-labelledby="address-heading">
        <h2 id="address-heading" className="text-xl font-semibold">
          بيانات الشحن
        </h2>
        <TextField
          id="guest-email"
          label="البريد الإلكتروني (لإرسال تأكيد الطلب)"
          value={guest.email}
          onChange={(v) => onGuestChange({ email: v })}
          error={errors.email}
          type="email"
          dir="ltr"
          autoComplete="email"
        />
        <CountrySelect value={countryCode} onChange={onCountryChange} />
        <AddressFields idPrefix="guest" value={guest} onChange={onGuestChange} errors={errors} />
      </section>
    );
  }

  // ---------------------------------------------------------------- مسجل
  return (
    <section className="space-y-5" aria-labelledby="address-heading">
      <h2 id="address-heading" className="text-xl font-semibold">
        عنوان الشحن
      </h2>

      {addressesLoading && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        </div>
      )}

      {addressesError && (
        <div role="alert" className="p-4 rounded-xl border border-red-300 text-sm">
          تعذّر تحميل عناوينك.{" "}
          <button type="button" onClick={onRetryAddresses} className="underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      {!addressesLoading && addresses.length > 0 && (
        <div role="radiogroup" aria-label="العناوين المحفوظة" className="space-y-3">
          {addresses.map((a) => {
            const supported = isSupportedCountry(a.country);
            return (
              <label
                key={a.id}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedId === a.id ? "border-primary bg-muted/30" : ""
                } ${supported ? "" : "opacity-60"}`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === a.id}
                  onChange={() => onSelect(a.id)}
                  className="mt-1 accent-primary"
                />
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">
                    {a.fullName}
                    {a.isDefault && (
                      <span className="ms-2 text-xs bg-muted px-2 py-0.5 rounded">الافتراضي</span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {a.street}، {a.city}، {getCountryByCode(a.country)?.nameAr ?? a.country}
                    {a.postalCode ? ` — ${a.postalCode}` : ""}
                  </p>
                  <p className="text-muted-foreground" dir="ltr" style={{ textAlign: "start" }}>
                    {a.phone}
                  </p>
                  {!supported && (
                    <p className="text-xs text-red-600">لا نشحن إلى هذه الدولة حالياً.</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {showErrors && !selectedId && !addressesLoading && (
        <p role="alert" className="text-sm text-red-600">
          اختر عنواناً أو أضف عنواناً جديداً للمتابعة.
        </p>
      )}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm font-medium underline underline-offset-4"
        >
          إضافة عنوان جديد
        </button>
      ) : (
        <div className="p-4 rounded-xl border space-y-4">
          <h3 className="font-semibold">عنوان جديد</h3>
          <CountrySelect value={countryCode} onChange={onCountryChange} />
          <AddressFields
            idPrefix="new"
            value={draft}
            onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
            errors={draftErrors}
          />
          {saveError && (
            <p role="alert" className="text-sm text-red-600">
              {saveError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ…" : "حفظ العنوان"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setSaveError(null);
                setDraftErrors({});
              }}
              className="px-5 py-2 rounded-xl border text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}