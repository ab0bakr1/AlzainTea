import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import type { ProductListItem } from "@/services/products.service";
import WishlistButton from "./WishlistButton";

const COPY = {
  ar: { soldOut: "نفدت الكمية", sale: "خصم" },
  en: { soldOut: "Sold out", sale: "Sale" },
} as const;

export function ProductCard({ product }: { product: ProductListItem }) {
  const isAr = useLocale() !== "en";
  const t = isAr ? COPY.ar : COPY.en;

  const name = isAr ? product.nameAr : product.nameEn;
  const categoryName = product.category
    ? isAr
      ? product.category.nameAr
      : product.category.nameEn
    : null;

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const hasDiscount = compareAt !== null && compareAt > price;
  const available = product.stock - product.reservedStock > 0;

  return (
    // الغلاف relative: زر المفضلة أخ للرابط (لا يجوز وضع button داخل <a>)
    <div className="group relative rounded-[var(--radius-lg)] border border-[var(--color-form)] bg-[var(--color-bg)] transition hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)]">
      <Link
        href={`/products/${product.slug}`}
        className="grid gap-3 rounded-[var(--radius-lg)] p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
      >
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-form)]">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          )}
          {!available && (
            <span className="absolute start-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-xs text-white">
              {t.soldOut}
            </span>
          )}
          {hasDiscount && available && (
            <span className="absolute start-2 top-2 rounded-full bg-[var(--color-secondary)] px-2.5 py-1 text-xs font-medium text-black">
              {t.sale}
            </span>
          )}
        </div>

        <div className="grid gap-1">
          {categoryName && (
            <span className="text-xs text-[var(--color-text-secondary)]">{categoryName}</span>
          )}
          <h3 className="line-clamp-1 font-medium text-[var(--color-text-primary)]">{name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[var(--color-text-primary)]">
              ${price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[var(--color-text-disabled)] line-through">
                ${compareAt!.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <WishlistButton productId={product.id} className="absolute end-5 top-5 z-10" />
    </div>
  );
}