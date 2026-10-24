"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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

export default function ProductPurchasePanel(props: Props) {
  const { productId, slug, nameAr, nameEn, image, basePrice, compareAtPrice, available, variants } = props;
  const t = useTranslations("productPage");
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

  const stepBtn =
    "grid size-10 cursor-pointer place-items-center rounded-full ds-text-primary transition-colors hover:bg-[var(--color-primary-200)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="grid gap-6">
      {/* السعر */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="ds-price text-4xl">{fmt(price)}</span>
        {discount > 0 && compareAtPrice && (
          <>
            <span className="ds-price-compare text-lg">{fmt(compareAtPrice)}</span>
            <span className="ds-bg-gold ds-rounded-pill px-3 py-1 text-sm font-semibold">
              {t("save", { percent: discount })}
            </span>
          </>
        )}
      </div>

      {/* حالة المخزون */}
      <div>
        {!inStock ? (
          <span className="ds-badge ds-badge-danger px-3 py-1 text-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {t("outOfStock")}
          </span>
        ) : stock <= 5 ? (
          <span className="ds-badge ds-badge-warning px-3 py-1 text-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {t("lowStock", { count: stock })}
          </span>
        ) : (
          <span className="ds-badge ds-badge-success px-3 py-1 text-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {t("inStock")}
          </span>
        )}
      </div>

      <hr className="ds-gold-rule" />

      {/* الخيارات */}
      {variants.length > 0 && (
        <fieldset className="grid gap-3">
          <legend className="ds-text-primary mb-1 text-sm font-semibold">{t("option")}</legend>
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
                  className={`ds-rounded-pill cursor-pointer border px-5 py-2 text-sm transition-colors ${
                    selected
                      ? "ds-text-primary border-[var(--color-primary)] bg-[var(--color-primary-200)] font-semibold"
                      : "ds-text-secondary border-[var(--border-color-strong)] hover:border-[var(--color-primary)]"
                  } ${disabled ? "cursor-not-allowed line-through opacity-40" : ""}`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* الكمية + الإضافة للسلة */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="ds-rounded-pill inline-flex items-center gap-1 border border-[var(--border-color-strong)] bg-[var(--color-form)] p-1"
          role="group"
          aria-label={t("quantity")}
        >
          <button
            type="button"
            aria-label={t("decreaseQty")}
            disabled={!inStock || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className={stepBtn}
          >
            <Minus size={16} />
          </button>
          <output aria-live="polite" className="ds-numeric ds-text-primary min-w-10 text-center font-semibold">
            {quantity}
          </output>
          <button
            type="button"
            aria-label={t("increaseQty")}
            disabled={!inStock || quantity >= maxQty}
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            className={stepBtn}
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="ds-btn ds-btn-primary h-[52px] flex-1 px-8 text-base"
        >
          <ShoppingCart size={18} aria-hidden />
          {t("addToCart")}
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-[var(--color-success)]">
        {justAdded && (
          <span className="inline-flex items-center gap-2">
            <Check size={16} aria-hidden />
            {t("added")}
            <Link href="/cart" className="font-semibold underline underline-offset-2">
              {t("viewCart")}
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}