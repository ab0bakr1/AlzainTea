"use client";

import { useTranslations } from "next-intl";

export interface VariantRow {
  /** مفتاح React محلي فقط */
  key: string;
  /** معرّف قاعدة البيانات للمتغير القائم، وغائب للجديد */
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
}

export function newVariantRow(): VariantRow {
  return { key: Math.random().toString(36).slice(2), name: "", sku: "", price: "", stock: "0" };
}

const inputClass = "adm-control w-full";

export function ProductVariantsField({
  value,
  onChange,
}: {
  value: VariantRow[];
  onChange: (next: VariantRow[]) => void;
}) {
  const t = useTranslations("adminPanel.productVariants");

  function patch(key: string, changes: Partial<VariantRow>) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  return (
    <div className="grid gap-3">
      <p className="adm-subtle text-sm leading-7">{t("intro")}</p>

      {value.length > 0 && (
        <div className="grid gap-3">
          {value.map((row, index) => (
            <div
              key={row.key}
              className="grid gap-3 rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--color-bg-alt)] p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] sm:items-end"
            >
              <label className="grid gap-1 adm-subtle text-xs">
                {t("name")}
                <input
                  required
                  value={row.name}
                  onChange={(e) => patch(row.key, { name: e.target.value })}
                  placeholder={t("namePlaceholder")}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 adm-subtle text-xs">
                SKU
                <input
                  required
                  dir="ltr"
                  value={row.sku}
                  onChange={(e) => patch(row.key, { sku: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 adm-subtle text-xs">
                {t("price")}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => patch(row.key, { price: e.target.value })}
                  placeholder={t("pricePlaceholder")}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 adm-subtle text-xs">
                {t("stock")}
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={row.stock}
                  onChange={(e) => patch(row.key, { stock: e.target.value })}
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(value.filter((r) => r.key !== row.key))}
                aria-label={t("removeAria", { n: index + 1 })}
                className="ds-btn adm-btn-sm adm-btn-danger"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => onChange([...value, newVariantRow()])}
          disabled={value.length >= 30}
          className="ds-btn ds-btn-outline adm-btn-sm"
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}