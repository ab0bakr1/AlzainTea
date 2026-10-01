import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { categoryService } from "@/modules/categories/category.service";
import CategoryProducts from "@/components/shop/CategoryProducts";

type Props = { params: Promise<{ slug: string }> };

async function loadCategory(slug: string) {
  try {
    return await categoryService.getBySlug(slug);
  } catch (error) {
    const e = error as { statusCode?: number; status?: number };
    if ((e.statusCode ?? e.status) === 404) notFound();
    throw error; // أي خطأ آخر يذهب لـ error boundary بدل إخفائه كـ 404
  }
}

const COPY = {
  ar: { home: "الرئيسية", products: "المنتجات", subcats: "الأقسام الفرعية" },
  en: { home: "Home", products: "Products", subcats: "Subcategories" },
} as const;

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, locale] = await Promise.all([loadCategory(slug), getLocale()]);

  const isAr = locale !== "en";
  const t = isAr ? COPY.ar : COPY.en;
  const pick = (c: { nameAr: string; nameEn: string }) => (isAr ? c.nameAr : c.nameEn);
  const name = pick(category);
  const crumbLink =
    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-[var(--color-text-secondary)]">
          <li>
            <Link href="/" className={crumbLink}>
              {t.home}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/products" className={crumbLink}>
              {t.products}
            </Link>
          </li>
          {category.parent && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/category/${category.parent.slug}`} className={crumbLink}>
                  {pick(category.parent)}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-[var(--color-text-primary)]">
            {name}
          </li>
        </ol>
      </nav>

      <header className="mb-8 flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-4xl">
            {name}
          </h1>
          {category.description && (
            <p className="mt-3 leading-relaxed text-[var(--color-text-secondary)]">
              {category.description}
            </p>
          )}
        </div>

        {category.image && (
          <div className="relative hidden h-28 w-28 shrink-0 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-form)] md:block">
            <Image src={category.image} alt={name} fill sizes="112px" className="object-cover" />
          </div>
        )}
      </header>

      {category.children.length > 0 && (
        <section aria-label={t.subcats} className="mb-8 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="rounded-full border border-[var(--color-form)] bg-[var(--color-bg-alt)] px-4 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
            >
              {pick(child)}
            </Link>
          ))}
        </section>
      )}

      {/* useSearchParams داخل المكوّن يتطلب Suspense أثناء البناء */}
      <Suspense fallback={null}>
        <CategoryProducts slug={slug} />
      </Suspense>
    </main>
  );
}