// src/app/(shop)/category/[slug]/page.tsx
// تصميم فقط: نفس البيانات ونفس منطق التحميل، والنصوص كلها من ar.json / en.json
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, locale, t, tn, tp] = await Promise.all([
    loadCategory(slug),
    getLocale(),
    getTranslations("categoryPage"),
    getTranslations("nav"),
    getTranslations("products.catalog"),
  ]);

  const isAr = locale !== "en";
  const pick = (c: { nameAr: string; nameEn: string }) => (isAr ? c.nameAr : c.nameEn);
  const name = pick(category);

  const crumbLink =
    "transition-colors hover:text-[var(--brand-gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-gold)]";

  return (
    <main>
      {/* ===== بانر الفئة: نفس لغة هيرو الصفحة الرئيسية (حبر + توهّج ذهبي) ===== */}
      <header
        className="relative isolate overflow-hidden"
        style={{ backgroundImage: "var(--gradient-ink)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, rgba(201,164,92,0.18) 0%, transparent 60%)",
          }}
        />

        <div className="ds-container py-10 sm:py-14">
          <nav aria-label={tp("breadcrumbLabel")}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-on-inverse)]/70">
              <li>
                <Link href="/" className={crumbLink}>
                  {tn("home")}
                </Link>
              </li>
              <li aria-hidden className="text-[var(--brand-gold)]/60">
                <span className="inline-block rtl:-scale-x-100">›</span>
              </li>
              <li>
                <Link href="/products" className={crumbLink}>
                  {tn("products")}
                </Link>
              </li>
              {category.parent && (
                <>
                  <li aria-hidden className="text-[var(--brand-gold)]/60">
                    <span className="inline-block rtl:-scale-x-100">›</span>
                  </li>
                  <li>
                    <Link href={`/category/${category.parent.slug}`} className={crumbLink}>
                      {pick(category.parent)}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden className="text-[var(--brand-gold)]/60">
                <span className="inline-block rtl:-scale-x-100">›</span>
              </li>
              <li aria-current="page" className="font-medium text-[var(--brand-gold-light)]">
                {name}
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="ds-text-gold text-4xl leading-[1.35] sm:text-5xl">{name}</h1>
              {category.description && (
                <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--color-on-inverse)]/80">
                  {category.description}
                </p>
              )}
            </div>

            {category.image && (
              <div className="relative hidden size-36 shrink-0 overflow-hidden rounded-[var(--radius-2xl)] border border-[rgba(201,164,92,0.35)] bg-[var(--brand-ink-soft)] shadow-[var(--shadow-gold)] md:block lg:size-44">
                <Image
                  src={category.image}
                  alt={name}
                  fill
                  sizes="176px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
        <hr className="ds-gold-rule" />
      </header>

      {/* ===== الأقسام الفرعية: pills بـ hover ذهبي ===== */}
      {category.children.length > 0 && (
        <section
          aria-label={t("subcategories")}
          className="border-b border-[var(--border-color)] bg-[var(--color-bg-alt)]"
        >
          <div className="ds-container flex flex-wrap items-center gap-2.5 py-4 md:gap-3">
            <h2 className="ds-font-heading me-2 text-base font-semibold text-[var(--color-text-primary)]">
              {t("subcategories")}
            </h2>
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${child.slug}`}
                className="rounded-full border border-[var(--border-color)] bg-[var(--color-bg)] px-5 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-200)] hover:text-[var(--color-accent-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
              >
                {pick(child)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== شبكة المنتجات ===== */}
      <div className="ds-container py-8 lg:py-12">
        {/* useSearchParams داخل المكوّن يتطلب Suspense أثناء البناء */}
        <Suspense fallback={null}>
          <CategoryProducts slug={slug} />
        </Suspense>
      </div>
    </main>
  );
}