import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getSitemapEntries } from "@/modules/seo/seo.service";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/faqs"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/pricing"), changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const { products, categories } = await getSitemapEntries();
    return [
      ...staticPages,
      ...categories.map((c) => ({
        url: absoluteUrl(`/category/${c.slug}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...products.map((p) => ({
        url: absoluteUrl(`/products/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    // لا نُفشل الـ build إذا لم تتوفر قاعدة البيانات
    console.error("[sitemap] DB unavailable, returning static pages only", error);
    return staticPages;
  }
}