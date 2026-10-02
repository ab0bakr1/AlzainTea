"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/atoms/Button";
import Title from "@/components/atoms/Title";
import { cn } from "@/lib/cn";
import { useAddresses } from "@/hooks/useAddresses";
import { getApiErrorMessage, type Address, type AddressPayload } from "@/services/addresses";
import AddressForm from "./AddressForm";
import { countryName, useAccountText } from "./account-i18n";

function Modal({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={closeLabel} onClick={onClose} className="absolute inset-0 cursor-default bg-black/50" />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl">
        <h3 className="mb-5 text-xl font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AddressesManager() {
  const { t, lang } = useAccountText();
  const { query, create, update, remove } = useAddresses();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const addresses = query.data ?? [];
  const saving = create.isPending || update.isPending;

  const closeForm = () => {
    setEditing(null);
    setFormError(null);
  };

  async function handleSubmit(payload: AddressPayload) {
    setFormError(null);
    try {
      if (editing === "new") await create.mutateAsync(payload);
      else if (editing) await update.mutateAsync({ id: editing.id, data: payload });
      closeForm();
      setNotice(t.saved);
    } catch (err) {
      setFormError(getApiErrorMessage(err, t.genericError));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setFormError(null);
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
      setNotice(t.removed);
    } catch (err) {
      setFormError(getApiErrorMessage(err, t.genericError));
    }
  }

  async function handleSetDefault(address: Address) {
    try {
      await update.mutateAsync({ id: address.id, data: { isDefault: true } });
      setNotice(t.defaultSet);
    } catch (err) {
      setNotice(getApiErrorMessage(err, t.genericError));
    }
  }

  return (
    <section aria-labelledby="addresses-heading" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title size="md" className="font-semibold" >
            <span id="addresses-heading">{t.addresses}</span>
          </Title>
          <p className="mt-1 text-sm text-zinc-500">{t.addressesDesc}</p>
        </div>
        {addresses.length > 0 && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={16} className="me-1.5" />
            {t.add}
          </Button>
        )}
      </div>

      <p role="status" aria-live="polite" className={cn("text-sm text-emerald-700 dark:text-emerald-400", !notice && "sr-only")}>
        {notice}
      </p>

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {t.loadError}
          <button onClick={() => query.refetch()} className="cursor-pointer font-medium underline">
            {t.retry}
          </button>
        </div>
      )}

      {query.isSuccess && addresses.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <MapPin size={28} className="mb-3 text-zinc-400" />
          <p className="font-medium">{t.emptyTitle}</p>
          <p className="mb-5 mt-1 text-sm text-zinc-500">{t.emptyDesc}</p>
          <Button size="md" onClick={() => setEditing("new")}>
            <Plus size={16} className="me-1.5" />
            {t.add}
          </Button>
        </div>
      )}

      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex flex-col rounded-xl border p-5",
                a.isDefault ? "border-zinc-900 dark:border-zinc-300" : "border-zinc-200 dark:border-zinc-800",
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold">{a.fullName}</p>
                {a.isDefault && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {t.default}
                  </span>
                )}
              </div>
              <address className="flex-1 space-y-0.5 text-sm not-italic text-zinc-600 dark:text-zinc-400">
                <p>{a.street}</p>
                <p>
                  {a.city}
                  {a.postalCode ? `، ${a.postalCode}` : ""}
                </p>
                <p>{countryName(a.country, lang)}</p>
                <p dir="ltr" className="text-start">
                  {a.phone}
                </p>
              </address>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
                <button onClick={() => setEditing(a)} className="inline-flex cursor-pointer items-center gap-1.5 hover:underline">
                  <Pencil size={14} />
                  {t.edit}
                </button>
                <button
                  onClick={() => {
                    setFormError(null);
                    setDeleting(a);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-red-700 hover:underline dark:text-red-400"
                >
                  <Trash2 size={14} />
                  {t.delete}
                </button>
                {!a.isDefault && (
                  <button
                    onClick={() => handleSetDefault(a)}
                    disabled={update.isPending}
                    className="ms-auto cursor-pointer text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-400"
                  >
                    {t.setDefault}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing === "new" ? t.addTitle : t.editTitle} onClose={closeForm} closeLabel={t.close}>
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            isFirstAddress={addresses.length === 0}
            submitting={saving}
            serverError={formError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title={t.deleteTitle} onClose={() => setDeleting(null)} closeLabel={t.close}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.deleteMsg}</p>
          <p className="mt-2 text-sm font-medium">
            {deleting.fullName} — {deleting.street}, {deleting.city}
          </p>
          {formError && (
            <p role="alert" className="mt-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-500/15 dark:text-red-300">
              {formError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDeleting(null)}
              disabled={remove.isPending}
              className="cursor-pointer rounded-md px-4 py-2 text-base text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t.cancel}
            </button>
            <Button size="md" onClick={handleDelete} loading={remove.isPending} className="!bg-red-700">
              {remove.isPending ? t.deleting : t.confirmDelete}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}