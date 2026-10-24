// src/components/checkout/AddressStep.tsx
// الخطوة 1: العنوان. المسجل يختار عنواناً محفوظاً أو يضيف/يعدّل، والزائر يدخل بريده وعنوانه.

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SUPPORTED_COUNTRIES } from "@/lib/shipping-rates";
import { ADDRESSES_KEY } from "@/hooks/useAddresses";
import { addressService, type AddressPayload } from "@/services/addresses";
import type { NewAddressInput, SavedAddress } from "@/services/checkout.service";
import AddressForm, {
  AddressFields,
  CountrySelect,
  TextField,
  validateAddressFields,
  type AddressFieldsValue,
  type FieldErrors,
} from "@/components/shop/AddressForm";
import StepHeading from "@/components/checkout/StepHeading";
import { countryLabel } from "@/components/checkout/checkout-utils";

// إعادة تصدير للحفاظ على الاستيرادات الحالية (CheckoutView وغيره)
export { validateAddressFields };
export type { AddressFieldsValue };

export type GuestForm = AddressFieldsValue & { email: string };

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

  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // دولة الطلب (الشحن/العملة/البوابة/الضريبة) يجب أن تطابق دولة العنوان المختار دائماً،
  // وإلا يُعرض للعميل سعر دولة ويُحاسَب على دولة أخرى. الخادم يرفض أي عدم تطابق.
  useEffect(() => {
    if (!isAuthenticated || !selectedId) return;
    const selected = addresses.find((a) => a.id === selectedId);
    if (selected && isSupportedCountry(selected.country) && selected.country !== countryCode) {
      onCountryChange(selected.country);
    }
  }, [isAuthenticated, selectedId, addresses, countryCode, onCountryChange]);

  async function handleUpdate(id: string, payload: AddressPayload) {
    await addressService.update(id, payload);
    // نحدّث مفتاح useAddresses، ونستدعي إعادة التحميل التي يملكها CheckoutView
    // تحسباً لاستخدامه مفتاح استعلام مختلفاً.
    void qc.invalidateQueries({ queryKey: ADDRESSES_KEY });
    onRetryAddresses();
  }

  // ---------------------------------------------------------------- زائر
  if (!isAuthenticated) {
    const errors = showErrors ? validateGuestForm(guest) : {};
    return (
      <section className="space-y-6" aria-labelledby="address-heading">
        <StepHeading id="address-heading">{t("address.shippingData")}</StepHeading>
        <TextField
          id="guest-email"
          label={t("address.guestEmail")}
          value={guest.email}
          onChange={(v) => onGuestChange({ email: v })}
          error={errors.email ? t("address.emailInvalid") : undefined}
          type="email"
          dir="ltr"
          autoComplete="email"
        />
        <CountrySelect id="checkout-country" value={countryCode} onChange={onCountryChange} />
        <AddressFields idPrefix="guest" value={guest} onChange={onGuestChange} errors={errors} />
      </section>
    );
  }

  // ---------------------------------------------------------------- مسجل
  return (
    <section className="space-y-6" aria-labelledby="address-heading">
      <StepHeading id="address-heading">{t("shippingAddress")}</StepHeading>

      {addressesLoading && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-form)]" />
          <div className="h-24 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-form)]" />
        </div>
      )}

      {addressesError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger)]"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            {t("address.loadError")}{" "}
            <button type="button" onClick={onRetryAddresses} className="font-semibold underline underline-offset-4">
              {tc("retry")}
            </button>
          </p>
        </div>
      )}

      {!addressesLoading && addresses.length > 0 && (
        <div role="radiogroup" aria-label={t("savedAddresses")} className="space-y-3">
          {addresses.map((a) => {
            if (editingId === a.id) {
              return (
                <AddressForm
                  key={a.id}
                  idPrefix={`edit-${a.id}`}
                  title={t("address.editTitle")}
                  initial={{
                    fullName: a.fullName,
                    phone: a.phone,
                    city: a.city,
                    street: a.street,
                    postalCode: a.postalCode ?? "",
                    country: a.country,
                    isDefault: a.isDefault,
                  }}
                  defaultCountry={a.country}
                  submitLabel={t("address.saveEdits")}
                  showDefaultToggle
                  onSubmit={async (payload) => {
                    await handleUpdate(a.id, payload);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            const supported = isSupportedCountry(a.country);
            return (
              <div key={a.id} className="flex items-start gap-2">
                <label
                  className={`flex flex-1 items-start gap-4 rounded-[var(--radius-xl)] border p-5 transition-[border-color,background-color,box-shadow] duration-200 ${
                    supported
                      ? "cursor-pointer hover:border-[var(--border-color-strong)] hover:shadow-[var(--shadow-sm)]"
                      : "cursor-not-allowed opacity-60"
                  } ${
                    selectedId === a.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-200)]"
                      : "border-[var(--border-color)] bg-[var(--color-bg-alt)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedId === a.id}
                    disabled={!supported}
                    onChange={() => onSelect(a.id)}
                    className="mt-1 size-4 accent-[var(--color-primary)]"
                  />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">
                      {a.fullName}
                      {a.isDefault && <span className="ds-badge ms-2">{t("address.default")}</span>}
                    </p>
                    <p className="text-[var(--color-text-secondary)]">
                      {a.street}، {a.city}، {countryLabel(a.country, locale)}
                      {a.postalCode ? ` — ${a.postalCode}` : ""}
                    </p>
                    <p className="text-[var(--color-text-secondary)]" dir="ltr" style={{ textAlign: "start" }}>
                      {a.phone}
                    </p>
                    {!supported && (
                      <p className="text-xs font-medium text-[var(--color-danger)]">{t("address.unsupported")}</p>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(a.id);
                  }}
                  className="ds-btn ds-btn-outline mt-4 px-4 text-sm"
                  aria-label={t("address.editAria", { name: a.fullName })}
                >
                  {tc("edit")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showErrors && !selectedId && !addressesLoading && (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {t("address.selectPrompt")}
        </p>
      )}

      {!adding ? (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="ds-btn ds-btn-outline px-5 text-sm"
        >
          <Plus size={16} aria-hidden />
          {t("addNewAddress")}
        </button>
      ) : (
        <AddressForm
          idPrefix="new"
          title={t("address.newTitle")}
          defaultCountry={countryCode}
          submitLabel={t("address.save")}
          showDefaultToggle
          initial={{ isDefault: addresses.length === 0 }}
          onSubmit={async (payload) => {
            await onAddAddress(payload);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </section>
  );
}