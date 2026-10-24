// src/app/page.tsx
// الصفحة الرئيسية — Server Component مع ISR. مربوطة بـ:
//   GET /api/categories
//   GET /api/products?status=ACTIVE&sort=newest&limit=8
//   GET /api/products?status=ACTIVE&sort=bestselling&limit=8
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Leaf, Truck, CreditCard, Star, DollarSign } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Category = { id: string; nameAr: string; nameEn: string; slug: string };
type Product = {
  id: string; nameAr: string; nameEn: string; slug: string;
  price: number | string; compareAtPrice?: number | string | null;
  images?: string[]; stock?: number; reservedStock?: number;
  category?: { nameAr: string; nameEn: string } | null;
};

async function api<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.success) return [];
    const d = json.data;
    return Array.isArray(d) ? d : (d?.items ?? d?.products ?? []);
  } catch {
    return [];
  }
}

// نقاط تألق خافتة في الـ Hero (زخرفة CSS فقط)
const sparks = [
  { top: "18%", left: "10%", size: 3, delay: "0s" },
  { top: "74%", left: "44%", size: 3, delay: "1.6s" },
  { top: "28%", left: "90%", size: 3, delay: "2.6s" },
] as const;

const money = (v: number | string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    style: "currency", currency: "USD",
  }).format(Number(v));

function ProductCard({ p, locale, soldOut }: { p: Product; locale: string; soldOut: string }) {
  const isAr = locale === "ar";
  const name = isAr ? p.nameAr : p.nameEn;
  const available = Math.max(0, (p.stock ?? 1) - (p.reservedStock ?? 0));
  const onSale = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
  const pct = onSale
    ? Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100)
    : 0;
  return (
    <Link
      href={`/products/${p.slug}`}
      className="group block transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--h-accent)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--h-surface)] transition-[box-shadow,border-color] duration-200 group-hover:border-[var(--border-color-strong)] group-hover:shadow-[var(--shadow-md)]">
        {p.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
        {available === 0 && (
          <span className="absolute start-3 top-3 rounded-full bg-[var(--brand-ink)] px-3 py-1 text-xs text-[#f0e6d3]">
            {soldOut}
          </span>
        )}
        {onSale && available > 0 && pct > 0 && (
          <span className="absolute end-3 top-3 rounded-full bg-[var(--brand-ink)] px-3 py-1 text-xs font-semibold tabular-nums text-[#f0e6d3]">
            -{pct}%
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{name}</h3>
        <p className="shrink-0 text-sm tabular-nums">
          {onSale && <span className="me-2 text-[var(--h-muted)] line-through">{money(p.compareAtPrice!, locale)}</span>}
          <span className="font-bold">{money(p.price, locale)}</span>
        </p>
      </div>
      {p.category && (
        <p className="mt-1 text-sm text-[var(--h-muted)]">{isAr ? p.category.nameAr : p.category.nameEn}</p>
      )}
    </Link>
  );
}

function Section({ title, href, all, children }: { title: string; href?: string; all?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <div aria-hidden className="ds-dune-divider mb-12 opacity-40" />
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
          <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
        </div>
        {href && all && (
          <Link
            href={href}
            className="shrink-0 rounded-full border border-transparent px-5 py-2 text-sm font-medium transition-colors hover:border-[var(--border-color-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--h-accent)]"
          >
            {all}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  const t = await getTranslations("HomePage");
  const isAr = locale === "ar";

  const [categories, newest, best] = await Promise.all([
    api<Category>("/api/categories"),
    api<Product>("/api/products?status=ACTIVE&sort=newest&limit=8"),
    api<Product>("/api/products?status=ACTIVE&sort=bestselling&limit=8"),
  ]);

  const trust = [
    { icon: Truck, title: t("trust.shipping.title"), desc: t("trust.shipping.desc") },
    { icon: CreditCard, title: t("trust.payment.title"), desc: t("trust.payment.desc") },
    { icon: Star, title: t("trust.reviews.title"), desc: t("trust.reviews.desc") },
    { icon: DollarSign, title: t("trust.currency.title"), desc: t("trust.currency.desc") },
  ];

  const grid = "grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-8";

  return (
    <main className="home bg-[var(--h-bg)] text-[var(--h-ink)]">
      <style>{`
        .home{
          --h-bg:var(--color-bg-alt);
          --h-surface:var(--color-form);
          --h-ink:var(--color-text-primary);
          --h-muted:var(--color-text-secondary);
          --h-accent:var(--color-accent-text);
          --h-deep:var(--brand-ink);
          --h-leaf:var(--brand-leaf);
          --h-r-lg:var(--radius-2xl);
          --h-glass:rgba(255,255,255,.04);
          --h-glass-border:rgba(240,230,211,.12);
          --gradient-hero:linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
        }
        /* الـ Hero داكن دائماً في الوضعين */
        .home .hero{
          --h-bg:#0f0d0a;--h-surface:#1a1612;--h-ink:#f0e6d3;--h-muted:#c4b49e;--h-accent:#d8c9a8;
          background:var(--gradient-hero);color:var(--h-ink);
        }
        .cta-box{
          background-image:radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),var(--gradient-hero);
          background-size:22px 22px,auto;
        }
        @keyframes steep{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes twinkle{0%,100%{opacity:.08;transform:scale(.6)}50%{opacity:.45;transform:scale(1)}}
        .cup{animation:steep 1.1s cubic-bezier(.2,.7,.2,1) both}
        .cup-float{animation:float 7s ease-in-out infinite}
        .spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:twinkle 5s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.cup,.cup-float{animation:none}.spark{animation:none;opacity:.25}}
      `}</style>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: t("brand"), url: BASE },
            {
              "@type": "WebSite", name: t("brand"), url: BASE, inLanguage: locale,
              potentialAction: {
                "@type": "SearchAction",
                target: `${BASE}/products?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />

      {/* Hero */}
      <div className="hero relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {sparks.map((s, i) => (
            <span
              key={i}
              className="spark"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
            />
          ))}
        </div>

        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-14 md:grid-cols-2 md:px-8 md:pb-24 md:pt-28">
          <div>
            <h1 className="ds-font-heading max-w-[16ch] text-4xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-6xl md:leading-[1.15] lg:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t("heroSubtitle")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="ds-btn bg-[#f0e6d3] px-8 py-4 text-[#0f0d0a] hover:bg-white"
              >
                {t("shopNow")}
              </Link>
              <a
                href="#categories"
                className="ds-btn border border-[#f0e6d3]/30 px-8 py-4 text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5"
              >
                {t("browseCategories")}
              </a>
            </div>
          </div>

          {/* كوب شاي مرسوم من الأعلى */}
          <div aria-hidden className="cup mx-auto aspect-square w-full max-w-md">
            <div className="cup-float h-full w-full">
              <svg viewBox="0 0 400 400" className="h-full w-full">
                <defs>
                  <radialGradient id="g" cx=".35" cy=".3" r=".8">
                    <stop offset="0" stopColor="#fff" stopOpacity=".18" />
                    <stop offset="1" stopColor="#000" stopOpacity=".4" />
                  </radialGradient>
                  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
                    <stop offset="0.6" stopColor="#c9a45c" stopOpacity=".08" />
                    <stop offset="1" stopColor="#c9a45c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="200" r="198" fill="url(#glow)" />
                <circle cx="200" cy="200" r="180" fill="var(--h-surface)" stroke="#f0e6d3" strokeOpacity=".12" strokeWidth="2" />
                <circle cx="200" cy="200" r="150" fill="#0f0d0a" stroke="#c9a45c" strokeOpacity=".3" strokeWidth="2" />
                <circle cx="200" cy="200" r="128" fill="#7a4f27" />
                <circle cx="200" cy="200" r="128" fill="url(#g)" />
                <g fill="var(--h-leaf)">
                  <ellipse cx="160" cy="185" rx="26" ry="10" transform="rotate(-30 160 185)" />
                  <ellipse cx="228" cy="225" rx="24" ry="9" transform="rotate(35 228 225)" />
                  <ellipse cx="205" cy="160" rx="20" ry="8" transform="rotate(75 205 160)" />
                </g>
                <path d="M330 200a22 22 0 0 1 0 44" fill="none" stroke="#f0e6d3" strokeOpacity=".15" strokeWidth="14" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* الفئات */}
      {categories.length > 0 && (
        <section id="categories" className="bg-[var(--h-deep)] text-[#f0e6d3]">
          <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-[#f0e6d3] md:text-4xl">{t("categoriesTitle")}</h2>
              <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[#f0e6d3]/25" />
            </div>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="group flex h-full min-h-36 flex-col justify-between rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] bg-[var(--h-glass)] p-5 text-lg font-semibold backdrop-blur-sm transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[rgba(201,164,92,0.45)] focus-visible:outline-2 focus-visible:outline-[#f0e6d3]"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-[#f0e6d3]/70 transition-colors group-hover:text-[var(--brand-gold)]"
                    >
                      <Leaf size={20} />
                    </span>
                    <span>{isAr ? c.nameAr : c.nameEn}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* وصل حديثاً */}
      <Section title={t("newArrivals")} href="/products?sort=newest" all={t("viewAll")}>
        {newest.length ? (
          <div className={grid}>{newest.map((p) => <ProductCard key={p.id} p={p} locale={locale} soldOut={t("soldOut")} />)}</div>
        ) : (
          <p className="text-[var(--h-muted)]">
            {t("emptyProducts")} <Link href="/products" className="underline">{t("shopNow")}</Link>
          </p>
        )}
      </Section>

      {/* الأكثر مبيعاً */}
      {best.length > 0 && (
        <div className="bg-[var(--h-surface)]/50">
          <Section title={t("bestSellers")} href="/products?sort=bestselling" all={t("viewAll")}>
            <div className={grid}>{best.map((p) => <ProductCard key={p.id} p={p} locale={locale} soldOut={t("soldOut")} />)}</div>
          </Section>
        </div>
      )}

      {/* لماذا الزين */}
      <div className="ds-bg-dune">
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <dl className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {trust.map((x) => {
              const Icon = x.icon;
              return (
                <div
                  key={x.title}
                  className="rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--color-bg)] p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[var(--border-color-strong)] hover:shadow-[var(--shadow-md)]"
                >
                  <span
                    aria-hidden
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--h-surface)] text-[var(--h-accent)]"
                  >
                    <Icon size={26} />
                  </span>
                  <dt className="mt-5 text-lg font-bold">{x.title}</dt>
                  <dd className="mt-2 text-sm leading-7 text-[var(--h-muted)]">{x.desc}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      {/* دعوة للتسجيل */}
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="cta-box rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] px-6 py-14 text-center text-[#f0e6d3] md:py-20">
          <h2 className="ds-font-heading text-3xl font-bold text-[#f0e6d3] md:text-5xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-[#f5ede0]/75">{t("ctaText")}</p>
          <Link
            href="/register"
            className="ds-btn mt-9 bg-[var(--brand-gold)] px-10 py-5 text-lg text-[#0f0d0a] hover:bg-[var(--brand-gold-light)]"
          >
            {t("registerCta")}
          </Link>
        </div>
      </section>
    </main>
  );
}