"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useLocale } from "next-intl";
import { useToggleWishlist, useWishlistItems } from "@/hooks/useWishlist";

export default function MyWishlist() {
  const locale = useLocale();
  const ar = locale === "ar";
  const [page, setPage] = useState(1);
  const { data, isLoading } = useWishlistItems(page);
  const toggle = useToggleWishlist();

  const money = new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en-US", { style: "currency", currency: "USD" });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <Heart className="mx-auto mb-3" size={40} />
        <p className="mb-4">{ar ? "قائمة المفضلة فارغة" : "Your wishlist is empty"}</p>
        <Link href="/products" className="text-green-700 underline">
          {ar ? "تصفح المنتجات" : "Browse products"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data.items.map(({ product: p }) => {
          const unavailable = p.status !== "ACTIVE" || p.available <= 0;
          return (
            <div key={p.id} className="overflow-hidden rounded-lg border">
              <Link href={`/products/${p.slug}`} className="block">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={ar ? p.nameAr : p.nameEn} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-medium">{ar ? p.nameAr : p.nameEn}</h3>
                  <p className="font-semibold">{money.format(p.price)}</p>
                  {unavailable && (
                    <p className="text-xs text-red-600">{ar ? "غير متوفر حالياً" : "Currently unavailable"}</p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => toggle.mutate({ productId: p.id, inWishlist: true })}
                disabled={toggle.isPending}
                className="w-full border-t py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {ar ? "إزالة من المفضلة" : "Remove"}
              </button>
            </div>
          );
        })}
      </div>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {ar ? "السابق" : "Previous"}
          </button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <button
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {ar ? "التالي" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}