"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Heart, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { useToggleWishlist, useWishlistItems } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useCountry } from "@/hooks/useCountry";
import { convertPrice } from "@/lib/currency";
import { formatMoney } from "@/lib/order-format";
import type { WishlistEntry, WishlistProduct } from "@/services/wishlist";
import type { CartItem } from "@/types/cart";

const COPY = {
  ar: {
    title: "المفضلة",
    count: (n: number) => `${n} منتج`,
    moveAll: "نقل المتوفر إلى السلة",
    moveOne: "نقل إلى السلة",
    remove: "إزالة من المفضلة",
    soldOut: "نفدت الكمية",
    unavailable: "غير متاح حالياً",
    sale: "خصم",
    lowStock: (n: number) => `متبقي ${n} فقط`,
    addedOn: "أُضيف في",
    emptyTitle: "قائمة المفضلة فارغة",
    emptyDesc: "احفظ المنتجات التي أعجبتك هنا لتعود إليها بسهولة.",
    browse: "تصفّح المنتجات",
    errorTitle: "تعذّر تحميل المفضلة",
    errorDesc: "تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.",
    retry: "إعادة المحاولة",
    prev: "السابق",
    next: "التالي",
    pageOf: (p: number, t: number) => `صفحة ${p} من ${t}`,
    movedOne: (name: string) => `تم نقل «${name}» إلى السلة`,
    movedMany: (n: number) => `تم نقل ${n} منتجات إلى السلة`,
    removed: "تمت الإزالة من المفضلة",
    failed: "تعذّر تنفيذ العملية، حاول مرة أخرى",
  },
  en: {
    title: "Wishlist",
    count: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    moveAll: "Move available to cart",
    moveOne: "Move to cart",
    remove: "Remove from wishlist",
    soldOut: "Sold out",
    unavailable: "Currently unavailable",
    sale: "Sale",
    lowStock: (n: number) => `Only ${n} left`,
    addedOn: "Added on",
    emptyTitle: "Your wishlist is empty",
    emptyDesc: "Save the products you like here so you can easily come back to them.",
    browse: "Browse products",
    errorTitle: "Couldn't load your wishlist",
    errorDesc: "Check your connection and try again.",
    retry: "Try again",
    prev: "Previous",
    next: "Next",
    pageOf: (p: number, t: number) => `Page ${p} of ${t}`,
    movedOne: (name: string) => `"${name}" moved to your cart`,
    movedMany: (n: number) => `${n} items moved to your cart`,
    removed: "Removed from wishlist",
    failed: "Something went wrong, please try again",
  },
} as const;

const LOW_STOCK_THRESHOLD = 5;

/**
 * تحويل منتج المفضلة إلى بند سلة.
 * (نقطة الربط الوحيدة مع شكل CartItem — عدّل الحقول هنا فقط إن اختلف النوع عندك)
 * السعر بالدولار (USD) لأنه مصدر الحقيقة، والسلة/الدفع يحوّلان للعملة المحلية.
 */
function toCartItem(p: WishlistProduct): Omit<CartItem, "quantity"> {
  return {
    productId: p.id,
    variantId: null,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    image: p.image,
    price: p.price,
  };
}

function isPurchasable(p: WishlistProduct) {
  return p.status === "ACTIVE" && p.available > 0;
}

type Notice = { type: "success" | "error"; text: string };

export default function MyWishlist() {
  const isAr = useLocale() !== "en";
  const t = isAr ? COPY.ar : COPY.en;
  const numLocale = isAr ? "ar-u-nu-latn" : "en-US";

  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<Notice | null>(null);

  const { data, isPending, isError, isPlaceholderData, refetch } = useWishlistItems(page);
  const toggle = useToggleWishlist();
  const { addItem } = useCart();
  const { currency } = useCountry();

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  // إن أصبحت الصفحة الحالية فارغة بعد الحذف (آخر عنصر في الصفحة) نرجع للصفحة الأخيرة المتاحة
  useEffect(() => {
    if (data && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data, page]);

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  const nameOf = (p: WishlistProduct) => (isAr ? p.nameAr : p.nameEn);
  const fail = () => setNotice({ type: "error", text: t.failed });

  function removeOne(entry: WishlistEntry) {
    toggle.mutate(
      { productId: entry.product.id, inWishlist: true },
      { onSuccess: () => setNotice({ type: "success", text: t.removed }), onError: fail },
    );
  }

  function moveOne(entry: WishlistEntry) {
    addItem(toCartItem(entry.product));
    toggle.mutate(
      { productId: entry.product.id, inWishlist: true },
      {
        onSuccess: () =>
          setNotice({ type: "success", text: t.movedOne(nameOf(entry.product)) }),
        onError: fail,
      },
    );
  }

  async function moveAllAvailable() {
    const targets = items.filter((e) => isPurchasable(e.product));
    if (targets.length === 0) return;

    targets.forEach((e) => addItem(toCartItem(e.product)));
    const results = await Promise.allSettled(
      targets.map((e) => toggle.mutateAsync({ productId: e.product.id, inWishlist: true })),
    );
    const failed = results.some((r) => r.status === "rejected");
    setNotice(
      failed ? { type: "error", text: t.failed } : { type: "success", text: t.movedMany(targets.length) },
    );
  }

  function goTo(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasPurchasable = items.some((e) => isPurchasable(e.product));
  const showSkeleton = isPending || (items.length === 0 && total > 0);
  const showEmpty = !showSkeleton && !isError && total === 0;

  const dateFmt = new Intl.DateTimeFormat(numLocale, { dateStyle: "medium" });

  return (
    <section aria-labelledby="wishlist-title" className="grid gap-6">
      {/* الرأس */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 id="wishlist-title" className="text-2xl font-bold text-[var(--color-text-primary)]">
            {t.title}
          </h1>
          {data && total > 0 && (
            <span className="text-sm text-[var(--color-text-secondary)]">{t.count(total)}</span>
          )}
        </div>

        {hasPurchasable && (
          <button
            type="button"
            onClick={moveAllAvailable}
            disabled={toggle.isPending}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
          >
            <ShoppingBag size={16} aria-hidden />
            {t.moveAll}
          </button>
        )}
      </header>

      {/* إشعار حي لقارئات الشاشة */}
      <div role="status" aria-live="polite" className="min-h-0">
        {notice && (
          <p
            className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm ${
              notice.type === "success"
                ? "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400"
                : "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>

      {/* تحميل */}
      {showSkeleton && !isError && <WishlistSkeleton />}

      {/* خطأ */}
      {isError && !data && (
        <div className="grid justify-items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-form)] px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t.errorTitle}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{t.errorDesc}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-1 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
          >
            <RefreshCw size={16} aria-hidden />
            {t.retry}
          </button>
        </div>
      )}

      {/* فارغة */}
      {showEmpty && (
        <div className="grid justify-items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-form)] px-6 py-16 text-center">
          <Heart size={40} className="text-[var(--color-text-disabled)]" aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{t.emptyDesc}</p>
          <Link
            href="/products"
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t.browse}
          </Link>
        </div>
      )}

      {/* القائمة */}
      {!showSkeleton && items.length > 0 && (
        <ul
          className={`grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 lg:grid-cols-4 ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {items.map((entry) => {
            const p = entry.product;
            const name = nameOf(p);
            const active = p.status === "ACTIVE";
            const purchasable = isPurchasable(p);
            const hasDiscount = p.compareAtPrice !== null && p.compareAtPrice > p.price;
            const showLow = purchasable && p.available <= LOW_STOCK_THRESHOLD;
            const removing = toggle.isPending && toggle.variables?.productId === p.id;
            const localPrice =
              currency !== "USD"
                ? formatMoney(convertPrice(p.price, currency), currency, numLocale)
                : null;

            const body = (
              <>
                <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-form)]">
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className={`object-cover transition duration-300 ${
                        active ? "group-hover:scale-105" : "grayscale"
                      }`}
                    />
                  )}
                  {!active ? (
                    <span className="absolute start-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-xs text-white">
                      {t.unavailable}
                    </span>
                  ) : !purchasable ? (
                    <span className="absolute start-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-xs text-white">
                      {t.soldOut}
                    </span>
                  ) : hasDiscount ? (
                    <span className="absolute start-2 top-2 rounded-full bg-[var(--color-secondary)] px-2.5 py-1 text-xs font-medium text-black">
                      {t.sale}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-1">
                  <h3 className="line-clamp-1 font-medium text-[var(--color-text-primary)]">
                    {name}
                  </h3>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      ${p.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-[var(--color-text-disabled)] line-through">
                        ${p.compareAtPrice!.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {localPrice && (
                    <span className="text-xs text-[var(--color-text-secondary)]">≈ {localPrice}</span>
                  )}
                  {showLow && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {t.lowStock(p.available)}
                    </span>
                  )}
                </div>
              </>
            );

            return (
              <li
                key={p.id}
                className={`group relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-form)] bg-[var(--color-bg)] transition hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] ${
                  removing ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {active ? (
                  <Link
                    href={`/products/${p.slug}`}
                    className="grid gap-3 rounded-[var(--radius-lg)] p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="grid gap-3 p-3 opacity-70">{body}</div>
                )}

                {/* زر الإزالة: أخ للرابط (لا يجوز وضع button داخل <a>) */}
                <button
                  type="button"
                  onClick={() => removeOne(entry)}
                  disabled={removing}
                  aria-label={`${t.remove}: ${name}`}
                  title={t.remove}
                  className="absolute end-5 top-5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow transition hover:scale-105 hover:text-red-500 dark:bg-gray-800/90 dark:text-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
                >
                  <Trash2 size={16} aria-hidden />
                </button>

                <div className="mt-auto grid gap-2 p-3 pt-0">
                  {purchasable ? (
                    <button
                      type="button"
                      onClick={() => moveOne(entry)}
                      disabled={removing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
                    >
                      <ShoppingBag size={16} aria-hidden />
                      {t.moveOne}
                    </button>
                  ) : (
                    <span className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-form)] px-3 py-2 text-sm text-[var(--color-text-disabled)]">
                      {active ? t.soldOut : t.unavailable}
                    </span>
                  )}
                  <span className="text-center text-xs text-[var(--color-text-disabled)]">
                    {t.addedOn} {dateFmt.format(new Date(entry.addedAt))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* الترقيم */}
      {!showSkeleton && totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-form)] px-3 py-2 text-sm transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" aria-hidden />
            {t.prev}
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]" aria-current="page">
            {t.pageOf(page, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-form)] px-3 py-2 text-sm transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.next}
            <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
          </button>
        </nav>
      )}
    </section>
  );
}

function WishlistSkeleton() {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="grid animate-pulse gap-3 rounded-[var(--radius-lg)] border border-[var(--color-form)] p-3"
        >
          <div className="aspect-square rounded-[var(--radius-md)] bg-[var(--color-form)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--color-form)]" />
          <div className="h-4 w-1/3 rounded bg-[var(--color-form)]" />
          <div className="h-9 rounded-[var(--radius-md)] bg-[var(--color-form)]" />
        </li>
      ))}
    </ul>
  );
}