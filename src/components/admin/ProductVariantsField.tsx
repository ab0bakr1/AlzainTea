"use client";

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

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function ProductVariantsField({
  value,
  onChange,
}: {
  value: VariantRow[];
  onChange: (next: VariantRow[]) => void;
}) {
  function patch(key: string, changes: Partial<VariantRow>) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-stone-500">
        استخدمها عندما يُباع المنتج بأحجام أو عبوات مختلفة (مثل علبة 250غ وعلبة 500غ). عند وجود
        متغيرات يُخصم المخزون من المتغير نفسه عند الشراء.
      </p>

      {value.length > 0 && (
        <div className="grid gap-3">
          {value.map((row, index) => (
            <div
              key={row.key}
              className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] sm:items-end"
            >
              <label className="grid gap-1 text-xs text-stone-600">
                الاسم
                <input
                  required
                  value={row.name}
                  onChange={(e) => patch(row.key, { name: e.target.value })}
                  placeholder="علبة 250غ"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-xs text-stone-600">
                SKU
                <input
                  required
                  dir="ltr"
                  value={row.sku}
                  onChange={(e) => patch(row.key, { sku: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-xs text-stone-600">
                السعر (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => patch(row.key, { price: e.target.value })}
                  placeholder="سعر المنتج"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-xs text-stone-600">
                المخزون
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
                aria-label={`حذف المتغير ${index + 1}`}
                className="h-[38px] rounded-md border border-stone-300 px-3 text-sm text-red-600 hover:bg-red-50"
              >
                حذف
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
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          إضافة متغير
        </button>
      </div>
    </div>
  );
}