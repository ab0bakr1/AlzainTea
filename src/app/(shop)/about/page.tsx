// src/app/(shop)/about/page.tsx
// صفحة عن المتجر — Server Component، بنفس لغة تصميم الصفحة الرئيسية.
// كل النصوص من ar.json / en.json (namespace: "about"). لا API ولا منطق.
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Gem, Leaf, Package, Heart } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  const brand = await getTranslations("brand");
  return {
    title: `${t("title")} | ${brand("name")}`,
    description: t("subtitle"),
  };
}

// نقاط تألق خافتة في الـ Hero (زخرفة CSS فقط)
const sparks = [
  { top: "20%", left: "8%", size: 3, delay: "0s" },
  { top: "72%", left: "46%", size: 3, delay: "1.4s" },
  { top: "30%", left: "92%", size: 3, delay: "2.4s" },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("about");

  const stats = [
    { value: t("stats.countries.value"), label: t("stats.countries.label") },
    { value: t("stats.products.value"), label: t("stats.products.label") },
    { value: t("stats.customers.value"), label: t("stats.customers.label") },
  ];

  const values = [
    { icon: Gem, title: t("values.quality.title"), desc: t("values.quality.desc") },
    { icon: Leaf, title: t("values.origin.title"), desc: t("values.origin.desc") },
    { icon: Package, title: t("values.freshness.title"), desc: t("values.freshness.desc") },
    { icon: Heart, title: t("values.service.title"), desc: t("values.service.desc") },
  ];

  return (
    <main className="about bg-[var(--h-bg)] text-[var(--h-ink)]">
      <style>{`
        .about{
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
        .about .hero{
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
        .orn{animation:steep 1.1s cubic-bezier(.2,.7,.2,1) both}
        .orn-float{animation:float 7s ease-in-out infinite}
        .spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:twinkle 5s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.orn,.orn-float{animation:none}.spark{animation:none;opacity:.25}}
      `}</style>

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

        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-14 md:grid-cols-[1.3fr_.7fr] md:px-8 md:pb-24 md:pt-28">
          <div>
            <h1 className="ds-font-heading max-w-[18ch] text-4xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-6xl md:leading-[1.15]">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t("subtitle")}</p>
          </div>

          {/* زخرفة: ورقة شاي داخل حلقة ذهبية */}
          <div aria-hidden className="orn mx-auto hidden aspect-square w-full max-w-xs md:block">
            <div className="orn-float h-full w-full">
              <svg viewBox="0 0 400 400" className="h-full w-full">
                <defs>
                  <radialGradient id="aglow" cx=".5" cy=".5" r=".5">
                    <stop offset="0.6" stopColor="#c9a45c" stopOpacity=".08" />
                    <stop offset="1" stopColor="#c9a45c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="200" r="198" fill="url(#aglow)" />
                <circle cx="200" cy="200" r="170" fill="none" stroke="#f0e6d3" strokeOpacity=".12" strokeWidth="2" />
                <circle cx="200" cy="200" r="140" fill="#0f0d0a" stroke="#c9a45c" strokeOpacity=".3" strokeWidth="2" />
                <g transform="rotate(-35 200 200)">
                  <path d="M200 100c46 38 46 138 0 200-46-62-46-162 0-200Z" fill="var(--h-leaf)" />
                  <path d="M200 112v176" stroke="#0f0d0a" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* قصتنا + رسالتنا */}
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">{t("storyTitle")}</h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
            <p className="mt-8 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t("storyContent")}</p>

            <div className="mt-10 border-s-2 border-[var(--border-color-strong)] ps-6">
              <h3 className="text-xl font-bold">{t("missionTitle")}</h3>
              <p className="mt-3 max-w-prose leading-8 text-[var(--h-muted)]">{t("missionContent")}</p>
            </div>
          </div>

          {/* لوحة جانبية بدل الصورة — يمكن استبدالها بصورة حقيقية لاحقاً */}
          <div
            aria-hidden
            className="relative mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center overflow-hidden rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] shadow-[var(--shadow-md)]"
            style={{ background: "var(--gradient-hero)" }}
          >
            <svg viewBox="0 0 300 375" className="h-full w-full">
              <circle cx="150" cy="187" r="118" fill="none" stroke="#c9a45c" strokeOpacity=".3" strokeWidth="2" />
              <circle cx="150" cy="187" r="92" fill="#1a1612" stroke="#f0e6d3" strokeOpacity=".12" strokeWidth="2" />
              <circle cx="150" cy="187" r="70" fill="#7a4f27" />
              <g fill="var(--h-leaf)">
                <ellipse cx="124" cy="176" rx="20" ry="8" transform="rotate(-30 124 176)" />
                <ellipse cx="176" cy="204" rx="19" ry="7" transform="rotate(35 176 204)" />
                <ellipse cx="156" cy="158" rx="15" ry="6" transform="rotate(75 156 158)" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* أرقامنا */}
      <section className="bg-[var(--h-deep)] text-[#f0e6d3]">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#f0e6d3] md:text-4xl">{t("statsTitle")}</h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[#f0e6d3]/25" />
          </div>
          <dl className="grid gap-5 md:grid-cols-3 md:gap-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] bg-[var(--h-glass)] p-8 backdrop-blur-sm transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[rgba(201,164,92,0.45)]"
              >
                <dt
                  dir="ltr"
                  className="ds-font-heading text-start text-5xl font-bold tabular-nums text-[var(--brand-gold)] md:text-6xl"
                >
                  {s.value}
                </dt>
                <dd className="mt-3 text-base leading-7 text-[#f0e6d3]/75">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* قيمنا */}
      <div className="ds-bg-dune">
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <div className="mb-10">
            <h2 className="text-3xl font-bold md:text-4xl">{t("valuesTitle")}</h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
          </div>
          <dl className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {values.map((x) => {
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

      {/* دعوة للتسوق */}
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="cta-box rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] px-6 py-14 text-center text-[#f0e6d3] md:py-20">
          <h2 className="ds-font-heading text-3xl font-bold text-[#f0e6d3] md:text-5xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-[#f5ede0]/75">{t("ctaText")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="ds-btn bg-[var(--brand-gold)] px-10 py-5 text-lg text-[#0f0d0a] hover:bg-[var(--brand-gold-light)]"
            >
              {t("shopCta")}
            </Link>
            <Link
              href="/contact"
              className="ds-btn border border-[#f0e6d3]/30 px-10 py-5 text-lg text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5"
            >
              {t("contactCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}