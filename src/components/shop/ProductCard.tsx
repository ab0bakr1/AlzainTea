import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ProductListItem } from "@/services/products.service";
import WishlistButton from "./WishlistButton";

// نفس تنسيق الأسعار المستخدم في الصفحة الرئيسية
const money = (v: number, locale: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-US" : "ar-SA-u-nu-latn", {
    style: "currency",
    currency: "USD",
  }).format(v);

export function ProductCard({ product }: { product: ProductListItem }) {
  const locale = useLocale();
  const isAr = locale !== "en";
  const t = useTranslations("products.card");

  const name = isAr ? product.nameAr : product.nameEn;
  const categoryName = product.category
    ? isAr
      ? product.category.nameAr
      : product.category.nameEn
    : null;

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const hasDiscount = compareAt !== null && compareAt > price;
  const percent = hasDiscount ? Math.round((1 - price / compareAt!) * 100) : 0;
  const available = product.stock - product.reservedStock > 0;

  return (
    // الغلاف relative: زر المفضلة أخ للرابط (لا يجوز وضع button داخل <a>)
    <div className="group relative transition-transform duration-200 hover:-translate-y-1">
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring-color)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-form)] transition-[box-shadow,border-color] duration-200 group-hover:border-[var(--border-color-gold)] group-hover:shadow-[var(--shadow-gold)]">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          )}
          {!available && (
            <span className="absolute start-3 top-3 rounded-full bg-[var(--brand-ink)] px-3 py-1 text-xs text-[#f0e6d3]">
              {t("soldOut")}
            </span>
          )}
          {hasDiscount && available && percent > 0 && (
            <span className="absolute start-3 top-3 rounded-full bg-[var(--brand-gold-deep)] px-3 py-1 text-xs font-semibold tabular-nums text-[#fff8e8]">
              {t("sale", { percent })}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-1">
          {categoryName && (
            <span className="text-xs text-[var(--color-text-secondary)]">{categoryName}</span>
          )}
          <h3 className="line-clamp-1 text-base font-bold leading-snug text-[var(--color-text-primary)]">
            {name}
          </h3>
          <p className="flex items-baseline gap-2 text-sm tabular-nums">
            <span className="font-bold text-[var(--color-text-primary)]">{money(price, locale)}</span>
            {hasDiscount && (
              <span className="text-[var(--color-text-disabled)] line-through">
                {money(compareAt!, locale)}
              </span>
            )}
          </p>
        </div>
      </Link>

      <WishlistButton productId={product.id} className="absolute end-3 top-3 z-10" />
    </div>
  );
}