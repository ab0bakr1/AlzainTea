// src/components/shop/AddressesManager.tsx
// إدارة عناوين الحساب: عرض / إضافة / تعديل / حذف / تعيين افتراضي.
// مربوط بـ useAddresses → /api/addresses و /api/addresses/[id].

"use client";

import { useState } from "react";
import { getCountryByCode } from "@/lib/shipping-rates";
import { useAddresses } from "@/hooks/useAddresses";
import { getApiErrorMessage, type Address } from "@/services/addresses";
import AddressForm from "./AddressForm";

type Mode = { type: "idle" } | { type: "add" } | { type: "edit"; id: string };

export default function AddressesManager() {
  const { query, create, update, remove } = useAddresses();
  const [mode, setMode] = useState<Mode>({ type: "idle" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const addresses: Address[] = query.data ?? [];

  async function runAction(id: string, fn: () => Promise<unknown>, fallback: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(getApiErrorMessage(e, fallback));
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="addresses-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="addresses-heading" className="text-xl font-semibold">
          عناوين الشحن
        </h2>
        {mode.type !== "add" && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setMode({ type: "add" });
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            إضافة عنوان
          </button>
        )}
      </div>

      {actionError && (
        <p role="alert" className="p-3 rounded-xl border border-red-300 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {mode.type === "add" && (
        <AddressForm
          idPrefix="account-new"
          title="عنوان جديد"
          defaultCountry="SA"
          submitLabel="حفظ العنوان"
          showDefaultToggle
          initial={{ isDefault: addresses.length === 0 }}
          onSubmit={async (payload) => {
            await create.mutateAsync(payload);
            setMode({ type: "idle" });
          }}
          onCancel={() => setMode({ type: "idle" })}
        />
      )}

      {query.isLoading && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      )}

      {query.isError && (
        <div role="alert" className="p-4 rounded-xl border border-red-300 text-sm">
          تعذّر تحميل عناوينك.{" "}
          <button type="button" onClick={() => query.refetch()} className="underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      {!query.isLoading && !query.isError && addresses.length === 0 && mode.type !== "add" && (
        <p className="p-6 rounded-xl border border-dashed text-sm text-muted-foreground text-center">
          لا توجد عناوين محفوظة. أضف عنواناً ليظهر هنا ويُستخدم عند الدفع.
        </p>
      )}

      <ul className="space-y-3">
        {addresses.map((a) => {
          if (mode.type === "edit" && mode.id === a.id) {
            return (
              <li key={a.id}>
                <AddressForm
                  idPrefix={`account-edit-${a.id}`}
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
                    await update.mutateAsync({ id: a.id, data: payload });
                    setMode({ type: "idle" });
                  }}
                  onCancel={() => setMode({ type: "idle" })}
                />
              </li>
            );
          }

          const busy = busyId === a.id;
          const confirming = confirmDeleteId === a.id;

          return (
            <li key={a.id} className="p-4 rounded-xl border space-y-3" aria-busy={busy}>
              <div className="text-sm space-y-0.5">
                <p className="font-medium">
                  {a.fullName}
                  {a.isDefault && <span className="ms-2 text-xs bg-muted px-2 py-0.5 rounded">الافتراضي</span>}
                </p>
                <p className="text-muted-foreground">
                  {a.street}، {a.city}، {getCountryByCode(a.country)?.nameAr ?? a.country}
                  {a.postalCode ? ` — ${a.postalCode}` : ""}
                </p>
                <p className="text-muted-foreground" dir="ltr" style={{ textAlign: "start" }}>
                  {a.phone}
                </p>
              </div>

              {confirming ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>حذف هذا العنوان نهائياً؟</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction(a.id, () => remove.mutateAsync(a.id), "تعذّر حذف العنوان")}
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
                  >
                    {busy ? "جارٍ الحذف…" : "نعم، احذف"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-1.5 rounded-lg border"
                  >
                    تراجع
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setActionError(null);
                      setMode({ type: "edit", id: a.id });
                    }}
                    className="px-4 py-1.5 rounded-lg border hover:bg-muted/50 disabled:opacity-50"
                  >
                    تعديل
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          a.id,
                          () => update.mutateAsync({ id: a.id, data: { isDefault: true } }),
                          "تعذّر تعيين العنوان كافتراضي"
                        )
                      }
                      className="px-4 py-1.5 rounded-lg border hover:bg-muted/50 disabled:opacity-50"
                    >
                      تعيين كافتراضي
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDeleteId(a.id)}
                    className="px-4 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}