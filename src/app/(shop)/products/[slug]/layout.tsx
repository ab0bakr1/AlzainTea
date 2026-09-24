import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildProductBreadcrumbs,
  buildProductJsonLd,
  buildProductMetadata,
  getProductSeo,
  notFoundMetadata,
  type SeoLocale,
} from "@/modules/seo/seo.service";

type Params = { params: Promise<{ slug: string }> };

async function resolveLocale(): Promise<SeoLocale> {
  try {
    return (await getLocale()) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const seo = await getProductSeo(slug);
  if (!seo) return notFoundMetadata();
  return buildProductMetadata(seo, await resolveLocale());
}

export default async function ProductSlugLayout({
  children,
  params,
}: Params & { children: ReactNode }) {
  const { slug } = await params;
  const seo = await getProductSeo(slug);
  const locale = await resolveLocale();

  return (
    <>
      {seo && (
        <JsonLd data={[buildProductJsonLd(seo, locale), buildProductBreadcrumbs(seo, locale)]} />
      )}
      {children}
    </>
  );
}