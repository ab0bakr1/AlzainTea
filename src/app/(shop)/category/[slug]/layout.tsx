import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildCategoryBreadcrumbs,
  buildCategoryMetadata,
  getCategorySeo,
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
  const seo = await getCategorySeo(slug);
  if (!seo) return notFoundMetadata();
  return buildCategoryMetadata(seo, await resolveLocale());
}

export default async function CategorySlugLayout({
  children,
  params,
}: Params & { children: ReactNode }) {
  const { slug } = await params;
  const seo = await getCategorySeo(slug);
  const locale = await resolveLocale();

  return (
    <>
      {seo && <JsonLd data={buildCategoryBreadcrumbs(seo, locale)} />}
      {children}
    </>
  );
}