// src/app/page.tsx
// الصفحة الرئيسية — Server Component مع ISR. مربوطة بـ:
//   GET /api/categories
//   GET /api/products?status=ACTIVE&sort=newest&limit=8
//   GET /api/products?status=ACTIVE&sort=bestselling&limit=8
import Link from "next/link";
import { getLocale } from "next-intl/server";
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

const copy = {
  ar: {
    brand: "الزين للشاي",
    heroTitle: "شاي فاخر، يصل إلى بابك في الخليج",
    heroText: "أوراق مختارة من أفضل المزارع، تُعبَّأ طازجة وتُشحن إلى السعودية وعُمان والإمارات والكويت والبحرين وقطر، ولبقية العالم.",
    shop: "تسوّق الآن", browse: "تصفّح الفئات", categories: "الفئات",
    newest: "وصل حديثاً", best: "الأكثر مبيعاً", all: "عرض الكل",
    soldOut: "نفد المخزون",
    empty: "لا توجد منتجات معروضة حالياً. تصفّح الكتالوج الكامل.",
    trust: [
      { t: "شحن لـ 6 دول خليجية", d: "وشحن دولي مع تكلفة ومدة توصيل تظهر قبل الدفع." },
      { t: "دفع محلي وآمن", d: "Apple Pay وmada وبطاقات الخليج، وStripe للعملاء الدوليين." },
      { t: "تقييمات من مشترين فعليين", d: "لا يقيّم المنتج إلا من استلمه." },
      { t: "أسعار بعملتك", d: "ريال، درهم، ريال عُماني، دينار كويتي وبحريني، ريال قطري." },
    ],
    ctaTitle: "جرّب أول علبة اليوم",
    ctaText: "أنشئ حساباً لتحفظ عناوينك وقائمة رغباتك وتتابع طلباتك.",
    register: "إنشاء حساب",
  },
  en: {
    brand: "Alzain Tea",
    heroTitle: "Premium tea, delivered across the Gulf",
    heroText: "Hand-picked leaves from the best estates, packed fresh and shipped to Saudi Arabia, Oman, the UAE, Kuwait, Bahrain, Qatar and worldwide.",
    shop: "Shop now", browse: "Browse categories", categories: "Categories",
    newest: "New arrivals", best: "Best sellers", all: "View all",
    soldOut: "Out of stock",
    empty: "No products to show right now. Browse the full catalog.",
    trust: [
      { t: "Shipping to 6 GCC countries", d: "Plus worldwide, with cost and delivery time shown before you pay." },
      { t: "Secure local payment", d: "Apple Pay, mada and Gulf cards, with Stripe for international orders." },
      { t: "Reviews from real buyers", d: "Only customers who received a product can review it." },
      { t: "Prices in your currency", d: "SAR, AED, OMR, KWD, BHD and QAR." },
    ],
    ctaTitle: "Try your first tin today",
    ctaText: "Create an account to save addresses and a wishlist, and track your orders.",
    register: "Create account",
  },
} as const;

type T = (typeof copy)["ar"] | (typeof copy)["en"];

const money = (v: number | string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    style: "currency", currency: "USD",
  }).format(Number(v));

function ProductCard({ p, locale, t }: { p: Product; locale: string; t: T }) {
  const isAr = locale === "ar";
  const name = isAr ? p.nameAr : p.nameEn;
  const available = Math.max(0, (p.stock ?? 1) - (p.reservedStock ?? 0));
  const onSale = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
  return (
    <Link href={`/products/${p.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--h-accent)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--h-r-lg)] bg-[var(--h-surface)]">
        {p.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
        {available === 0 && (
          <span className="absolute start-3 top-3 rounded-full bg-[var(--h-ink)] px-3 py-1 text-xs text-[var(--h-bg)]">
            {t.soldOut}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{name}</h3>
        <p className="shrink-0 text-sm tabular-nums">
          {onSale && <span className="me-2 text-[var(--h-muted)] line-through">{money(p.compareAtPrice!, locale)}</span>}
          <span className="font-semibold">{money(p.price, locale)}</span>
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
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {href && all && (
          <Link href={href} className="text-sm font-medium underline underline-offset-4 hover:text-[var(--h-accent)]">{all}</Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  const t = copy[locale];
  const isAr = locale === "ar";

  const [categories, newest, best] = await Promise.all([
    api<Category>("/api/categories"),
    api<Product>("/api/products?status=ACTIVE&sort=newest&limit=8"),
    api<Product>("/api/products?status=ACTIVE&sort=bestselling&limit=8"),
  ]);

  const grid = "grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6";

  return (
    <main className="home bg-[var(--h-bg)] text-[var(--h-ink)]">
      <style>{`
        .home{--h-bg:#f4f7f3;--h-surface:#e4ebe2;--h-ink:#14261f;--h-muted:#5c6b63;--h-accent:#a8741f;--h-deep:#14261f;--h-leaf:#8fa66b;--h-r-lg:22px}
        .dark .home{--h-bg:#0e1a15;--h-surface:#1a2b23;--h-ink:#eef3ec;--h-muted:#9db0a5;--h-accent:#d9a545;--h-deep:#0a130f}
        @keyframes steep{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
        .cup{animation:steep 1.1s cubic-bezier(.2,.7,.2,1) both}
        @media (prefers-reduced-motion:reduce){.cup{animation:none}}
      `}</style>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: t.brand, url: BASE },
            {
              "@type": "WebSite", name: t.brand, url: BASE, inLanguage: locale,
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
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-10 pt-12 md:grid-cols-2 md:px-8 md:pb-16 md:pt-20">
        <div>
          <h1 className="max-w-[16ch] text-4xl font-extrabold leading-[1.15] md:text-6xl md:leading-[1.1]">{t.heroTitle}</h1>
          <p className="mt-6 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="rounded-full bg-[var(--h-deep)] px-7 py-3.5 font-semibold text-[#f4f7f3] transition-colors hover:bg-[var(--h-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--h-accent)]">
              {t.shop}
            </Link>
            <a href="#categories" className="rounded-full border border-[var(--h-ink)]/30 px-7 py-3.5 font-semibold transition-colors hover:border-[var(--h-accent)] hover:text-[var(--h-accent)]">
              {t.browse}
            </a>
          </div>
        </div>

        {/* كوب شاي مرسوم من الأعلى */}
        <div aria-hidden className="cup mx-auto aspect-square w-full max-w-md">
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              <radialGradient id="g" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#fff" stopOpacity=".25" />
                <stop offset="1" stopColor="#000" stopOpacity=".35" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="190" fill="var(--h-surface)" />
            <circle cx="200" cy="200" r="150" fill="var(--h-bg)" stroke="var(--h-ink)" strokeOpacity=".15" strokeWidth="2" />
            <circle cx="200" cy="200" r="128" fill="var(--h-accent)" />
            <circle cx="200" cy="200" r="128" fill="url(#g)" />
            <g fill="var(--h-leaf)">
              <ellipse cx="160" cy="185" rx="26" ry="10" transform="rotate(-30 160 185)" />
              <ellipse cx="228" cy="225" rx="24" ry="9" transform="rotate(35 228 225)" />
              <ellipse cx="205" cy="160" rx="20" ry="8" transform="rotate(75 205 160)" />
            </g>
            <path d="M330 200a22 22 0 0 1 0 44" fill="none" stroke="var(--h-ink)" strokeOpacity=".15" strokeWidth="14" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {/* الفئات */}
      {categories.length > 0 && (
        <section id="categories" className="bg-[var(--h-deep)] text-[#eef3ec]">
          <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
            <h2 className="mb-8 text-2xl font-bold md:text-3xl">{t.categories}</h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`}
                    className="flex h-full min-h-28 items-end rounded-[var(--h-r-lg)] border border-white/15 p-5 text-lg font-semibold transition-colors hover:border-[#d9a545] hover:text-[#d9a545] focus-visible:outline-2 focus-visible:outline-[#d9a545]">
                    {isAr ? c.nameAr : c.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* وصل حديثاً */}
      <Section title={t.newest} href="/products?sort=newest" all={t.all}>
        {newest.length ? (
          <div className={grid}>{newest.map((p) => <ProductCard key={p.id} p={p} locale={locale} t={t} />)}</div>
        ) : (
          <p className="text-[var(--h-muted)]">
            {t.empty} <Link href="/products" className="underline">{t.shop}</Link>
          </p>
        )}
      </Section>

      {/* الأكثر مبيعاً */}
      {best.length > 0 && (
        <div className="bg-[var(--h-surface)]/50">
          <Section title={t.best} href="/products?sort=bestselling" all={t.all}>
            <div className={grid}>{best.map((p) => <ProductCard key={p.id} p={p} locale={locale} t={t} />)}</div>
          </Section>
        </div>
      )}

      {/* لماذا الزين */}
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {t.trust.map((x) => (
            <div key={x.t} className="border-s-2 border-[var(--h-accent)] ps-4">
              <dt className="font-bold">{x.t}</dt>
              <dd className="mt-2 text-sm leading-7 text-[var(--h-muted)]">{x.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* دعوة للتسجيل */}
      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <div className="rounded-[var(--h-r-lg)] bg-[var(--h-deep)] px-6 py-12 text-center text-[#eef3ec] md:py-16">
          <h2 className="text-2xl font-bold md:text-4xl">{t.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-[#b9c8be]">{t.ctaText}</p>
          <Link href="/register" className="mt-8 inline-block rounded-full bg-[#d9a545] px-8 py-3.5 font-semibold text-[#14261f] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {t.register}
          </Link>
        </div>
      </section>
    </main>
  );
}