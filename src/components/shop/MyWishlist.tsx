"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Heart, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { useToggleWishlist, useWishlistItems } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useCountry } from "@/hooks/useCountry";
import { convertPrice } from "@/lib/currency";
import { formatMoney } from "@/lib/order-format";
import type { WishlistEntry, WishlistProduct } from "@/services/wishlist";
import type { CartItem } from "@/types/cart";

const LOW_STOCK_THRESHOLD = 5;

// نفس تنسيق الأسعار المستخدم في الصفحة الرئيسية وبطاقة المنتج
const usd = (v: number, locale: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-US" : "ar-SA-u-nu-latn", {
    style: "currency",
    currency: "USD",
  }).format(v);

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

// التركيز الظاهر الموحد (نفس أسلوب الصفحة الرئيسية)
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]";

export default function MyWishlist() {
  const locale = useLocale();
  const isAr = locale !== "en";
  const t = useTranslations("wishlist");
  const tCard = useTranslations("products.card");
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
  const lastPage = data ? Math.max(1, data.meta.totalPages) : 1;
  if (data && page > lastPage) setPage(lastPage);

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  const nameOf = (p: WishlistProduct) => (isAr ? p.nameAr : p.nameEn);
  const fail = () => setNotice({ type: "error", text: t("failed") });

  function removeOne(entry: WishlistEntry) {
    toggle.mutate(
      { productId: entry.product.id, inWishlist: true },
      { onSuccess: () => setNotice({ type: "success", text: t("removed") }), onError: fail },
    );
  }

  function moveOne(entry: WishlistEntry) {
    addItem(toCartItem(entry.product));
    toggle.mutate(
      { productId: entry.product.id, inWishlist: true },
      {
        onSuccess: () =>
          setNotice({ type: "success", text: t("movedOne", { name: nameOf(entry.product) }) }),
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
      failed
        ? { type: "error", text: t("failed") }
        : { type: "success", text: t("movedMany", { count: targets.length }) },
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
    <section aria-labelledby="wishlist-title" className="grid gap-8">
      {/* الرأس: فاصل الكثبان + عنوان بخط ذهبي رفيع تحته (نفس عناوين أقسام الرئيسية) */}
      <header>
        <div aria-hidden className="ds-dune-divider mb-8 opacity-40" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1
                id="wishlist-title"
                className="text-3xl font-bold text-[var(--color-text-primary)] md:text-4xl"
              >
                {t("title")}
              </h1>
              {data && total > 0 && (
                <span className="ds-badge tabular-nums">{t("count", { count: total })}</span>
              )}
            </div>
            <span
              aria-hidden
              className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]"
            />
          </div>

          {hasPurchasable && (
            <button
              type="button"
              onClick={moveAllAvailable}
              disabled={toggle.isPending}
              className={`ds-btn ds-btn-primary px-6 text-sm ${focusRing}`}
            >
              <ShoppingBag size={16} aria-hidden />
              {t("moveAll")}
            </button>
          )}
        </div>
      </header>

      {/* إشعار حي لقارئات الشاشة */}
      <div role="status" aria-live="polite" className="min-h-0">
        {notice && (
          <p
            className={`rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-medium ${
              notice.type === "success"
                ? "border-[var(--color-success)]/30 bg-[var(--color-success-bg)] text-[var(--color-success)]"
                : "border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
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
        <div className="grid justify-items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] px-6 py-16 text-center">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
          >
            <RefreshCw size={28} />
          </span>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t("errorTitle")}</h2>
          <p className="max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">
            {t("errorDesc")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={`ds-btn ds-btn-outline mt-2 px-6 text-sm ${focusRing}`}
          >
            <RefreshCw size={16} aria-hidden />
            {t("retry")}
          </button>
        </div>
      )}

      {/* فارغة */}
      {showEmpty && (
        <div className="ds-bg-dune grid justify-items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--border-color)] px-6 py-20 text-center">
          <span
            aria-hidden
            className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-color-strong)] bg-[var(--color-bg)] text-[var(--color-accent-text)] shadow-[var(--shadow-sm)]"
          >
            <Heart size={44} strokeWidth={1.5} />
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{t("empty")}</h2>
          <p className="max-w-md text-base leading-8 text-[var(--color-text-secondary)]">
            {t("emptyHint")}
          </p>
          <Link href="/products" className={`ds-btn ds-btn-primary mt-4 px-8 ${focusRing}`}>
            {t("browseProducts")}
          </Link>
        </div>
      )}

      {/* القائمة */}
      {!showSkeleton && items.length > 0 && (
        <ul
          className={`grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {items.map((entry) => {
            const p = entry.product;
            const name = nameOf(p);
            const active = p.status === "ACTIVE";
            const purchasable = isPurchasable(p);
            const hasDiscount = p.compareAtPrice !== null && p.compareAtPrice > p.price;
            const percent = hasDiscount ? Math.round((1 - p.price / p.compareAtPrice!) * 100) : 0;
            const showLow = purchasable && p.available <= LOW_STOCK_THRESHOLD;
            const removing = toggle.isPending && toggle.variables?.productId === p.id;
            const localPrice =
              currency !== "USD"
                ? formatMoney(convertPrice(p.price, currency), currency, numLocale)
                : null;

            const imageBox = (
              <div
                className={`relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-form)] transition-[box-shadow,border-color] duration-200 ${
                  active
                    ? "group-hover:border-[var(--border-color-gold)] group-hover:shadow-[var(--shadow-gold)]"
                    : ""
                }`}
              >
                {p.image && (
                  <Image
                    src={p.image}
                    alt={name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className={`object-cover transition-transform duration-500 ${
                      active ? "group-hover:scale-[1.04]" : "grayscale"
                    }`}
                  />
                )}
              </div>
            );

            return (
              <li
                key={p.id}
                className={`group relative transition-[transform,opacity] duration-200 ${
                  active ? "hover:-translate-y-1" : ""
                } ${removing ? "pointer-events-none opacity-50" : ""}`}
              >
                {/* منطقة الصورة: الأزرار والشارات أشقاء للرابط (لا يجوز وضع button داخل <a>) */}
                <div className="relative">
                  {active ? (
                    <Link
                      href={`/products/${p.slug}`}
                      tabIndex={-1}
                      aria-hidden
                      className="block"
                    >
                      {imageBox}
                    </Link>
                  ) : (
                    imageBox
                  )}

                  {/* الشارات (نفس ألوان بطاقة المنتج) */}
                  {!active ? (
                    <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-[var(--brand-ink)] px-3 py-1 text-xs text-[#f0e6d3]">
                      {t("unavailable")}
                    </span>
                  ) : !purchasable ? (
                    <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-[var(--brand-ink)] px-3 py-1 text-xs text-[#f0e6d3]">
                      {tCard("soldOut")}
                    </span>
                  ) : hasDiscount && percent > 0 ? (
                    <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-[var(--brand-gold-deep)] px-3 py-1 text-xs font-semibold tabular-nums text-[#fff8e8]">
                      {tCard("sale", { percent })}
                    </span>
                  ) : null}

                  {/* زر الإزالة */}
                  <button
                    type="button"
                    onClick={() => removeOne(entry)}
                    disabled={removing}
                    aria-label={t("removeNamed", { name })}
                    title={t("remove")}
                    className={`absolute end-3 top-3 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--color-bg)]/90 text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] backdrop-blur-sm transition-[transform,border-color,color] duration-200 hover:scale-105 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-60 ${focusRing}`}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>

                  {/* زر "إضافة إلى السلة" فوق الصورة: يظهر عند hover على الأجهزة التي تدعمه،
                      ويبقى ظاهراً دائماً على اللمس، وعند تركيز لوحة المفاتيح */}
                  {purchasable && (
                    <button
                      type="button"
                      onClick={() => moveOne(entry)}
                      disabled={removing}
                      className={`ds-btn ds-btn-primary absolute inset-x-3 bottom-3 z-10 px-4 text-sm shadow-[var(--shadow-md)] transition-[opacity,transform,box-shadow] duration-200 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 ${focusRing}`}
                    >
                      <ShoppingBag size={16} aria-hidden />
                      {t("addToCart")}
                    </button>
                  )}
                </div>

                {/* معلومات المنتج */}
                <div className="mt-4 grid gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    {active ? (
                      <Link
                        href={`/products/${p.slug}`}
                        className={`min-w-0 ${focusRing}`}
                      >
                        <h3 className="line-clamp-1 text-base font-semibold leading-snug text-[var(--color-text-primary)]">
                          {name}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="line-clamp-1 min-w-0 text-base font-semibold leading-snug text-[var(--color-text-disabled)]">
                        {name}
                      </h3>
                    )}
                    <p className="shrink-0 text-sm tabular-nums">
                      {hasDiscount && (
                        <span className="me-2 text-[var(--color-text-disabled)] line-through">
                          {usd(p.compareAtPrice!, locale)}
                        </span>
                      )}
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {usd(p.price, locale)}
                      </span>
                    </p>
                  </div>
                  {localPrice && (
                    <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                      ≈ {localPrice}
                    </span>
                  )}
                  {showLow && (
                    <span className="text-xs font-medium text-[var(--color-warning)]">
                      {t("lowStock", { count: p.available })}
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-text-disabled)]">
                    {t("addedOn", { date: dateFmt.format(new Date(entry.addedAt)) })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* الترقيم */}
      {!showSkeleton && totalPages > 1 && (
        <nav
          aria-label={t("pagination")}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className={`ds-btn ds-btn-outline px-5 text-sm ${focusRing}`}
          >
            <ChevronLeft size={16} className="rtl:rotate-180" aria-hidden />
            {t("prev")}
          </button>
          <span
            className="text-sm tabular-nums text-[var(--color-text-secondary)]"
            aria-current="page"
          >
            {t("pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            className={`ds-btn ds-btn-outline px-5 text-sm ${focusRing}`}
          >
            {t("next")}
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
      className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-form)]" />
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <div className="h-4 w-1/2 rounded-full bg-[var(--color-form)]" />
            <div className="h-4 w-1/5 rounded-full bg-[var(--color-form)]" />
          </div>
          <div className="mt-2 h-3 w-1/3 rounded-full bg-[var(--color-form)]" />
        </li>
      ))}
    </ul>
  );
}