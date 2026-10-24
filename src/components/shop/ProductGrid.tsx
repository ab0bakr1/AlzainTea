import { useTranslations } from "next-intl";
import type { ProductListItem } from "@/services/products.service";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  const t = useTranslations("products.catalog");

  if (products.length === 0) {
    return (
      <div className="ds-card grid place-items-center border-dashed px-6 py-16 text-center">
        <p className="ds-font-heading text-xl font-semibold text-[var(--color-text-primary)]">
          {t("emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}