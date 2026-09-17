import Link from "next/link";
import Image from "next/image";
import type { ProductListItem } from "@/services/products.service";

export function ProductCard({ product }: { product: ProductListItem }) {
  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const hasDiscount = compareAt && compareAt > price;
  const available = product.stock - product.reservedStock > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group grid gap-3 rounded-xl border border-stone-200 p-3 transition hover:border-emerald-600/40 hover:shadow-sm"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.nameAr}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {!available && (
          <span className="absolute top-2 start-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs text-white">
            نفدت الكمية
          </span>
        )}
        {hasDiscount && available && (
          <span className="absolute top-2 start-2 rounded-full bg-emerald-700 px-2.5 py-1 text-xs text-white">
            خصم
          </span>
        )}
      </div>

      <div className="grid gap-1">
        <span className="text-xs text-stone-500">{product.category?.nameAr}</span>
        <h3 className="line-clamp-1 font-medium text-stone-900">{product.nameAr}</h3>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-stone-900">${price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-sm text-stone-400 line-through">${compareAt!.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}