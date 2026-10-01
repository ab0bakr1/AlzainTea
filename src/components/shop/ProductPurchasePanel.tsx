"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";

export type PanelVariant = { id: string; name: string; price: number | null; stock: number };

type Props = {
  productId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  image?: string;
  basePrice: number; // USD (مصدر الحقيقة)
  compareAtPrice: number | null;
  available: number; // stock - reservedStock
  variants: PanelVariant[];
  locale: "ar" | "en";
};

const T = {
  ar: {
    inStock: "متوفر في المخزون",
    lowStock: (n: number) => `متبقي ${n} فقط`,
    out: "نفدت الكمية حاليًا",
    add: "أضف إلى السلة",
    added: "تمت الإضافة إلى السلة",
    viewCart: "عرض السلة",
    qty: "الكمية",
    option: "الخيار",
    less: "إنقاص الكمية",
    more: "زيادة الكمية",
    save: (p: number) => `وفّر ${p}%`,
  },
  en: {
    inStock: "In stock",
    lowStock: (n: number) => `Only ${n} left`,
    out: "Currently out of stock",
    add: "Add to cart",
    added: "Added to cart",
    viewCart: "View cart",
    qty: "Quantity",
    option: "Option",
    less: "Decrease quantity",
    more: "Increase quantity",
    save: (p: number) => `Save ${p}%`,
  },
};

export default function ProductPurchasePanel(props: Props) {
  const { productId, slug, nameAr, nameEn, image, basePrice, compareAtPrice, available, variants, locale } = props;
  const t = T[locale];
  const { addItem } = useCart();

  const [variantId, setVariantId] = useState<string | null>(
    () => (variants.find((v) => v.stock > 0) ?? variants[0])?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const variant = useMemo(() => variants.find((v) => v.id === variantId) ?? null, [variants, variantId]);
  const price = variant?.price ?? basePrice;
  const stock = variant ? variant.stock : available;
  const inStock = stock > 0;
  const maxQty = Math.max(1, Math.min(stock, 20));
  const discount =
    compareAtPrice && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  function selectVariant(id: string) {
    setVariantId(id);
    setQuantity(1);
    setJustAdded(false);
  }

  function handleAdd() {
    if (!inStock) return;
    const withVariant = (base: string) => (variant ? `${base} — ${variant.name}` : base);
    addItem(
      {
        productId,
        variantId: variant?.id ?? null,
        slug,
        nameAr: withVariant(nameAr),
        nameEn: withVariant(nameEn),
        image: image ?? null,
        price,
        knownStock: stock,
      },
      quantity,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 4000);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold text-stone-900">{fmt(price)}</span>
        {discount > 0 && compareAtPrice && (
          <>
            <span className="text-lg text-stone-400 line-through">{fmt(compareAtPrice)}</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800">
              {t.save(discount)}
            </span>
          </>
        )}
      </div>

      {variants.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium text-stone-700">{t.option}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const selected = v.id === variantId;
              const disabled = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => selectVariant(v.id)}
                  className={`rounded-md border px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                    selected
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                      : "border-stone-300 text-stone-700 hover:border-stone-500"
                  } ${disabled ? "cursor-not-allowed line-through opacity-40" : ""}`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        {!inStock ? (
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">{t.out}</span>
        ) : stock <= 5 ? (
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
            {t.lowStock(stock)}
          </span>
        ) : (
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
            {t.inStock}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-md border border-stone-300" role="group" aria-label={t.qty}>
          <button
            type="button"
            aria-label={t.less}
            disabled={!inStock || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-3 text-stone-700 disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <output aria-live="polite" className="min-w-10 text-center tabular-nums">
            {quantity}
          </output>
          <button
            type="button"
            aria-label={t.more}
            disabled={!inStock || quantity >= maxQty}
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            className="p-3 text-stone-700 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-8"
        >
          <ShoppingCart size={18} aria-hidden />
          {t.add}
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-emerald-800">
        {justAdded && (
          <span className="inline-flex items-center gap-2">
            <Check size={16} aria-hidden />
            {t.added}
            <Link href="/cart" className="font-medium underline underline-offset-2">
              {t.viewCart}
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}