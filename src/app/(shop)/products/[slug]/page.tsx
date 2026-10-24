import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, ShieldCheck, Truck } from "lucide-react";
import { productService } from "@/modules/products/product.service";
import { ApiError } from "@/lib/api-error";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductPurchasePanel, { type PanelVariant } from "@/components/shop/ProductPurchasePanel";
import ProductReviews from "@/components/shop/ProductReviews";
import WishlistButton from "@/components/shop/WishlistButton";

// ملاحظة: الـ Metadata وبيانات JSON-LD (Product + BreadcrumbList) تُولَّد حصراً
// في layout.tsx المجاور عبر seo.service — لا تكررها هنا.

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  try {
    const product = await productService.getBySlug(slug);
    // منتجات المسودة/المؤرشفة لا تظهر للعامة
    if (product.status === "DRAFT" || product.status === "ARCHIVED") return null;
    return product;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export default async function ProductDetailsPage({ params }: Props) {
  const { slug } = await params;
  const [product, rawLocale, t, tHome] = await Promise.all([
    getProduct(slug),
    getLocale().catch(() => "ar"),
    getTranslations("productPage"),
    getTranslations("HomePage"),
  ]);
  if (!product) notFound();

  const locale: "ar" | "en" = rawLocale === "en" ? "en" : "ar";
  const pick = (ar?: string | null, en?: string | null) => (locale === "en" ? en || ar : ar || en) ?? "";

  const name = pick(product.nameAr, product.nameEn);
  const description = pick(product.descAr, product.descEn);
  const categoryName = pick(product.category?.nameAr, product.category?.nameEn);
  const brandName = pick(product.brand?.nameAr, product.brand?.nameEn);

  const variants: PanelVariant[] = (product.variants ?? []).map(
    (v: { id: string; name: string; price: unknown; stock: number }) => ({
      id: v.id,
      name: v.name,
      price: v.price != null ? Number(v.price) : null,
      stock: v.stock,
    }),
  );

  const crumbLink =
    "ds-text-secondary transition-colors hover:text-[var(--color-accent-text)]";
  const Sep = () => (
    <li aria-hidden className="ds-text-disabled">
      <ChevronRight size={14} className="rtl:rotate-180" />
    </li>
  );

  return (
    <div className="ds-container py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav aria-label={t("breadcrumbLabel")} className="ds-text-sm mb-8">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className={crumbLink}>
              {t("home")}
            </Link>
          </li>
          <Sep />
          <li>
            <Link href="/products" className={crumbLink}>
              {t("products")}
            </Link>
          </li>
          {product.category?.slug && (
            <>
              <Sep />
              <li>
                <Link href={`/category/${product.category.slug}`} className={crumbLink}>
                  {categoryName}
                </Link>
              </li>
            </>
          )}
          <Sep />
          <li aria-current="page" className="ds-text-primary font-medium">
            {name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="ds-card ds-rounded-2xl ds-shadow-sm p-2 sm:p-3">
            <ProductGallery images={product.images} alt={name} />
          </div>
        </div>

        {/* Info */}
        <div className="grid content-start gap-6">
          <div className="grid gap-3">
            {categoryName && <span className="ds-badge w-fit px-3 py-1 text-sm">{categoryName}</span>}
            <div className="flex items-start justify-between gap-4">
              <h1 className="ds-font-heading ds-text-primary text-3xl leading-snug font-bold sm:text-4xl">
                {name}
              </h1>
              <WishlistButton productId={product.id} className="shrink-0" />
            </div>
          </div>

          <div className="ds-card ds-rounded-2xl ds-shadow-sm p-5 sm:p-6">
            <ProductPurchasePanel
              productId={product.id}
              slug={product.slug}
              nameAr={product.nameAr}
              nameEn={product.nameEn}
              image={product.images[0]}
              basePrice={Number(product.price)}
              compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : null}
              available={Math.max(0, product.stock - product.reservedStock)}
              variants={variants}
              locale={locale}
            />
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { Icon: Truck, text: tHome("trust.shipping.title") },
              { Icon: ShieldCheck, text: tHome("trust.payment.title") },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="ds-bg-primary-200 ds-text-alt grid size-10 shrink-0 place-items-center rounded-full">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="ds-text-secondary ds-text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>

          <hr className="ds-gold-rule" />

          <section aria-labelledby="desc-title">
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="ds-bg-gold ds-rounded-pill h-6 w-1" />
              <h2 id="desc-title" className="ds-font-heading !text-xl">
                {t("description")}
              </h2>
            </div>
            <p className="ds-text-secondary leading-relaxed whitespace-pre-line">{description}</p>
          </section>

          <hr className="ds-gold-rule" />

          <section aria-labelledby="specs-title">
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="ds-bg-gold ds-rounded-pill h-6 w-1" />
              <h2 id="specs-title" className="ds-font-heading !text-xl">
                {t("specs")}
              </h2>
            </div>
            <dl className="ds-text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] py-3">
                <dt className="ds-text-secondary">{t("sku")}</dt>
                <dd className="ds-text-primary ds-numeric font-medium">{product.sku}</dd>
              </div>
              {brandName && (
                <div className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] py-3">
                  <dt className="ds-text-secondary">{t("brand")}</dt>
                  <dd className="ds-text-primary font-medium">{brandName}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>

      <div className="mt-16 sm:mt-20">
        <div className="ds-dune-divider mb-10" aria-hidden />
        <ProductReviews productId={product.id} slug={product.slug} />
      </div>
    </div>
  );
}