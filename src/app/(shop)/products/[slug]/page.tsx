import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { productService } from "@/modules/products/product.service";
import { ApiError } from "@/lib/api-error";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductPurchasePanel, { type PanelVariant } from "@/components/shop/ProductPurchasePanel";
import ProductReviews from "@/components/shop/ProductReviews";
import WishlistButton from "@/components/shop/WishlistButton";

// ملاحظة: الـ Metadata وبيانات JSON-LD (Product + BreadcrumbList) تُولَّد حصراً
// في layout.tsx المجاور عبر seo.service — لا تكررها هنا.

type Props = { params: Promise<{ slug: string }> };

const T = {
  ar: { home: "الرئيسية", products: "المنتجات", sku: "رمز المنتج", brand: "العلامة التجارية", desc: "وصف المنتج" },
  en: { home: "Home", products: "Products", sku: "SKU", brand: "Brand", desc: "Description" },
};

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
  const [product, rawLocale] = await Promise.all([getProduct(slug), getLocale().catch(() => "ar")]);
  if (!product) notFound();

  const locale: "ar" | "en" = rawLocale === "en" ? "en" : "ar";
  const t = T[locale];
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <nav aria-label="breadcrumb" className="mb-6 text-sm text-stone-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-stone-800">{t.home}</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/products" className="hover:text-stone-800">{t.products}</Link>
          </li>
          {product.category?.slug && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/category/${product.category.slug}`} className="hover:text-stone-800">
                  {categoryName}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-stone-800">{name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} alt={name} />

        <div className="grid content-start gap-5">
          <div className="grid gap-2">
            {categoryName && <span className="text-sm text-stone-500">{categoryName}</span>}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold leading-snug text-stone-900 sm:text-3xl">{name}</h1>
              <WishlistButton productId={product.id} />
            </div>
          </div>

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

          <section aria-labelledby="desc-title" className="border-t border-stone-200 pt-5">
            <h2 id="desc-title" className="mb-2 font-medium text-stone-900">{t.desc}</h2>
            <p className="whitespace-pre-line leading-relaxed text-stone-600">{description}</p>
          </section>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-stone-500">
            <dt>{t.sku}</dt>
            <dd className="text-stone-700">{product.sku}</dd>
            {brandName && (
              <>
                <dt>{t.brand}</dt>
                <dd className="text-stone-700">{brandName}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-14 border-t border-stone-200 pt-10">
        <ProductReviews productId={product.id} slug={product.slug} />
      </div>
    </div>
  );
}