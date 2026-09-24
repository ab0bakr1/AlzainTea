import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { SITE_NAME, SITE_NAME_AR, absoluteUrl } from "@/lib/site";
import {
  findCategoryForSeo,
  findProductForSeo,
  getApprovedRating,
  listSitemapCategories,
  listSitemapProducts,
} from "./seo.repository";

export type SeoLocale = "ar" | "en";

export interface ProductSeo {
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  price: number; // USD
  images: string[];
  available: number;
  updatedAt: string;
  category: { slug: string; nameAr: string; nameEn: string } | null;
  brand: { nameAr: string; nameEn: string } | null;
  rating: { average: number; count: number } | null;
}

export interface CategorySeo {
  slug: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  image: string | null;
  parent: { slug: string; nameAr: string; nameEn: string } | null;
}

const pick = (l: SeoLocale, ar: string, en: string) => (l === "ar" ? ar : en);

function plainText(input: string, max = 160): string {
  const text = input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// ── جلب البيانات (كاش 5 دقائق لتفادي ضرب DB مرتين: layout + page) ──
export const getProductSeo = unstable_cache(
  async (slug: string): Promise<ProductSeo | null> => {
    const p = await findProductForSeo(slug);
    if (!p) return null;
    const rating = await getApprovedRating(p.id);
    return {
      slug: p.slug,
      sku: p.sku,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descAr: p.descAr,
      descEn: p.descEn,
      price: Number(p.price),
      images: p.images,
      available: Math.max(0, p.stock - p.reservedStock),
      updatedAt: p.updatedAt.toISOString(),
      category: p.category,
      brand: p.brand,
      rating: rating.count > 0 ? rating : null,
    };
  },
  ["seo:product"],
  { revalidate: 300, tags: ["seo:product"] },
);

export const getCategorySeo = unstable_cache(
  async (slug: string): Promise<CategorySeo | null> => findCategoryForSeo(slug),
  ["seo:category"],
  { revalidate: 300, tags: ["seo:category"] },
);

// ── Metadata ──
export function notFoundMetadata(): Metadata {
  return { title: { absolute: SITE_NAME_AR }, robots: { index: false, follow: false } };
}

export function buildProductMetadata(seo: ProductSeo, locale: SeoLocale): Metadata {
  const name = pick(locale, seo.nameAr, seo.nameEn);
  const description = plainText(pick(locale, seo.descAr, seo.descEn));
  const siteName = pick(locale, SITE_NAME_AR, SITE_NAME);
  const url = absoluteUrl(`/products/${seo.slug}`);
  const images = seo.images.slice(0, 4).map((img) => absoluteUrl(img));
  const title = `${name} | ${siteName}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName,
      title,
      description,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      images: images.map((u) => ({ url: u, alt: name })),
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export function buildCategoryMetadata(seo: CategorySeo, locale: SeoLocale): Metadata {
  const name = pick(locale, seo.nameAr, seo.nameEn);
  const siteName = pick(locale, SITE_NAME_AR, SITE_NAME);
  const description = seo.description
    ? plainText(seo.description)
    : locale === "ar"
      ? `تسوق ${name} من متجر الزين للشاي — أجود أنواع الشاي الفاخر مع شحن لدول الخليج والعالم.`
      : `Shop ${name} at Alzain Tea — premium tea shipped across the GCC and worldwide.`;
  const url = absoluteUrl(`/category/${seo.slug}`);
  const title = `${name} | ${siteName}`;
  const images = seo.image ? [absoluteUrl(seo.image)] : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName,
      title,
      description,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

// ── JSON-LD ──
export function buildProductJsonLd(seo: ProductSeo, locale: SeoLocale) {
  const name = pick(locale, seo.nameAr, seo.nameEn);
  const url = absoluteUrl(`/products/${seo.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: plainText(pick(locale, seo.descAr, seo.descEn), 300),
    sku: seo.sku,
    url,
    image: seo.images.slice(0, 5).map((img) => absoluteUrl(img)),
    ...(seo.brand && { brand: { "@type": "Brand", name: pick(locale, seo.brand.nameAr, seo.brand.nameEn) } }),
    ...(seo.category && { category: pick(locale, seo.category.nameAr, seo.category.nameEn) }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD", // السعر الأساسي المخزَّن بالدولار
      price: seo.price.toFixed(2),
      availability:
        seo.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(seo.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(seo.rating.average.toFixed(1)),
        reviewCount: seo.rating.count,
      },
    }),
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductBreadcrumbs(seo: ProductSeo, locale: SeoLocale) {
  const items = [
    { name: pick(locale, "الرئيسية", "Home"), path: "/" },
    { name: pick(locale, "المنتجات", "Products"), path: "/products" },
  ];
  if (seo.category) {
    items.push({
      name: pick(locale, seo.category.nameAr, seo.category.nameEn),
      path: `/category/${seo.category.slug}`,
    });
  }
  items.push({ name: pick(locale, seo.nameAr, seo.nameEn), path: `/products/${seo.slug}` });
  return buildBreadcrumbJsonLd(items);
}

export function buildCategoryBreadcrumbs(seo: CategorySeo, locale: SeoLocale) {
  const items = [
    { name: pick(locale, "الرئيسية", "Home"), path: "/" },
    { name: pick(locale, "المنتجات", "Products"), path: "/products" },
  ];
  if (seo.parent) {
    items.push({
      name: pick(locale, seo.parent.nameAr, seo.parent.nameEn),
      path: `/category/${seo.parent.slug}`,
    });
  }
  items.push({ name: pick(locale, seo.nameAr, seo.nameEn), path: `/category/${seo.slug}` });
  return buildBreadcrumbJsonLd(items);
}

// ── Sitemap ──
export async function getSitemapEntries() {
  const [products, categories] = await Promise.all([
    listSitemapProducts(),
    listSitemapCategories(),
  ]);
  return { products, categories };
}