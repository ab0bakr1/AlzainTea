import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { productService } from "@/modules/products/product.service";
import { ApiError } from "@/lib/api-response";

export const revalidate = 60;

async function getProduct(slug: string) {
  try {
    return await productService.getBySlug(slug, { publicOnly: true });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "المنتج غير موجود" };

  return {
    title: `${product.nameAr} | متجر الزين للشاي`,
    description: product.descAr.slice(0, 160),
    openGraph: {
      title: product.nameAr,
      description: product.descAr.slice(0, 160),
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const available = product.stock - product.reservedStock > 0;

  // Structured Data - Product Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameEn,
    description: product.descEn,
    image: product.images,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price,
      availability: available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-10 md:grid-cols-2">
        <div className="grid gap-3">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
            {product.images[0] && (
              <Image
                src={product.images[0]}
                alt={product.nameAr}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((img) => (
                <div
                  key={img}
                  className="relative aspect-square overflow-hidden rounded-lg bg-stone-100"
                >
                  <Image src={img} alt={product.nameAr} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <span className="text-sm text-stone-500">{product.category?.nameAr}</span>
          <h1 className="text-2xl font-semibold text-stone-900">{product.nameAr}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-stone-900">${price.toFixed(2)}</span>
            {compareAt && compareAt > price && (
              <span className="text-lg text-stone-400 line-through">
                ${compareAt.toFixed(2)}
              </span>
            )}
          </div>

          <p className="leading-relaxed text-stone-600">{product.descAr}</p>

          <div>
            {available ? (
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                متوفر في المخزون
              </span>
            ) : (
              <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                نفدت الكمية حاليًا
              </span>
            )}
          </div>

          <button
            disabled={!available}
            className="mt-2 w-full rounded-md bg-emerald-700 px-5 py-3 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
          >
            أضف إلى السلة
          </button>
        </div>
      </div>
    </div>
  );
}