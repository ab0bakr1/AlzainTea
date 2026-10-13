// src/components/checkout/AddressStep.tsx
// الخطوة 1: العنوان. المسجل يختار عنواناً محفوظاً أو يضيف/يعدّل، والزائر يدخل بريده وعنوانه.

"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCountryByCode, SUPPORTED_COUNTRIES } from "@/lib/shipping-rates";
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
        <CountrySelect id="checkout-country" value={countryCode} onChange={onCountryChange} />
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
            if (editingId === a.id) {
              return (
                <AddressForm
                  key={a.id}
                  idPrefix={`edit-${a.id}`}
                  title="تعديل العنوان"
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
                  submitLabel="حفظ التعديلات"
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
                  className={`flex flex-1 items-start gap-3 p-4 rounded-xl border transition-colors ${
                    supported ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-60"
                  } ${selectedId === a.id ? "border-primary bg-muted/30" : ""}`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedId === a.id}
                    disabled={!supported}
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
                    {!supported && <p className="text-xs text-red-600">لا نشحن إلى هذه الدولة حالياً.</p>}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(a.id);
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted/50"
                  aria-label={`تعديل عنوان ${a.fullName}`}
                >
                  تعديل
                </button>
              </div>
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
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="text-sm font-medium underline underline-offset-4"
        >
          إضافة عنوان جديد
        </button>
      ) : (
        <AddressForm
          idPrefix="new"
          title="عنوان جديد"
          defaultCountry={countryCode}
          submitLabel="حفظ العنوان"
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