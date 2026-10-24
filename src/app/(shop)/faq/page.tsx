// src/app/(shop)/faq/page.tsx
// صفحة الأسئلة الشائعة — Server Component، بنفس لغة تصميم الصفحة الرئيسية وصفحة "عن الزين".
// كل النصوص من ar.json / en.json (namespace: "faq"). Accordion بعناصر <details> الأصلية: بدون JavaScript ولا API.
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  const brand = await getTranslations("brand");
  return {
    title: `${t("title")} | ${brand("name")}`,
    description: t("subtitle"),
  };
}

// ترتيب المجموعات (المفاتيح داخل faq.groups في ملفات الترجمة)
const GROUP_KEYS = ["shipping", "payment", "orders", "tea"] as const;

type QA = { q: string; a: string };

// نقاط تألق خافتة في الـ Hero (زخرفة CSS فقط)
const sparks = [
  { top: "24%", left: "10%", size: 3, delay: "0s" },
  { top: "70%", left: "48%", size: 3, delay: "1.5s" },
  { top: "32%", left: "90%", size: 3, delay: "2.5s" },
] as const;

export default async function FaqPage() {
  const t = await getTranslations("faq");

  const groups = GROUP_KEYS.map((key) => ({
    key,
    title: t(`groups.${key}.title`),
    items: t.raw(`groups.${key}.items`) as QA[],
  }));

  return (
    <main className="faq bg-[var(--h-bg)] text-[var(--h-ink)]">
      <style>{`
        .faq{
          --h-bg:var(--color-bg-alt);
          --h-surface:var(--color-form);
          --h-ink:var(--color-text-primary);
          --h-muted:var(--color-text-secondary);
          --h-accent:var(--color-accent-text);
          --h-deep:var(--brand-ink);
          --h-r-lg:var(--radius-2xl);
          --h-glass:rgba(255,255,255,.04);
          --h-glass-border:rgba(240,230,211,.12);
          --gradient-hero:linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
        }
        /* الـ Hero داكن دائماً في الوضعين */
        .faq .hero{
          --h-bg:#0f0d0a;--h-surface:#1a1612;--h-ink:#f0e6d3;--h-muted:#c4b49e;--h-accent:#d8c9a8;
          background:var(--gradient-hero);color:var(--h-ink);
        }
        .cta-box{
          background-image:radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),var(--gradient-hero);
          background-size:22px 22px,auto;
        }
        @keyframes twinkle{0%,100%{opacity:.08;transform:scale(.6)}50%{opacity:.45;transform:scale(1)}}
        .spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:twinkle 5s ease-in-out infinite}

        /* ===== Accordion ===== */
        .faq details > summary{list-style:none}
        .faq details > summary::-webkit-details-marker{display:none}

        /* الجواب: يظهر بحركة خفيفة في كل المتصفحات */
        @keyframes faq-reveal{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .faq details[open] > .faq-body{animation:faq-reveal .28s var(--ease-out) both}

        /* تحريك الارتفاع الفعلي في المتصفحات الداعمة (تحسين تدريجي) */
        @supports (interpolate-size:allow-keywords){
          .faq details{interpolate-size:allow-keywords}
          .faq details::details-content{
            block-size:0;overflow:clip;
            transition:block-size .3s var(--ease-out),content-visibility .3s allow-discrete;
          }
          .faq details[open]::details-content{block-size:auto}
        }
        @media (prefers-reduced-motion:reduce){
          .spark{animation:none;opacity:.25}
          .faq details[open] > .faq-body{animation:none}
          .faq details::details-content{transition:none}
        }
      `}</style>

      {/* Hero صغير داكن */}
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
        <section className="relative mx-auto max-w-7xl px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-20">
          <h1 className="ds-font-heading max-w-[20ch] text-4xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-6xl md:leading-[1.15]">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t("subtitle")}</p>
        </section>
      </div>

      {/* المحتوى: فهرس المجموعات + الأسئلة */}
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-[14rem_1fr] md:gap-14 lg:grid-cols-[16rem_1fr]">
          {/* الفهرس: أزرار أفقية في الجوال، عمودي لاصق في الشاشات الكبيرة */}
          <nav aria-label={t("jumpTo")} className="md:sticky md:top-28 md:self-start">
            <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:border-s md:border-[var(--border-color)] md:px-0 md:pb-0">
              {groups.map((g) => (
                <li key={g.key} className="shrink-0">
                  <a
                    href={`#${g.key}`}
                    className="block whitespace-nowrap rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--color-bg)] px-4 py-2 text-sm font-medium text-[var(--h-muted)] transition-colors duration-200 hover:border-[var(--border-color-gold)] hover:text-[var(--h-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--h-accent)] md:rounded-none md:border-0 md:bg-transparent md:px-5 md:py-2.5 md:text-base md:hover:bg-transparent"
                  >
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-14 md:space-y-16">
            {groups.map((g) => (
              <section key={g.key} id={g.key} aria-labelledby={`${g.key}-title`} className="scroll-mt-28">
                <h2 id={`${g.key}-title`} className="text-2xl font-bold md:text-3xl">
                  {g.title}
                </h2>
                <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />

                <div className="mt-6 overflow-hidden rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--color-bg)]">
                  {g.items.map((item, i) => (
                    <details
                      key={i}
                      className="group border-b border-[var(--border-color)] last:border-b-0"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 text-start text-base font-semibold leading-7 transition-colors duration-200 hover:bg-[var(--color-primary-200)]/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--h-accent)] md:px-7 md:text-lg">
                        <span>{item.q}</span>
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--h-surface)] text-[var(--h-accent)] transition-[transform,background-color,color] duration-300 group-open:rotate-180 group-open:bg-[var(--brand-gold)] group-open:text-[#0f0d0a]"
                        >
                          <ChevronDown size={18} />
                        </span>
                      </summary>
                      <div className="faq-body px-5 pb-6 md:px-7">
                        <p className="max-w-prose border-s-2 border-[var(--border-color-strong)] ps-5 leading-8 text-[var(--h-muted)]">
                          {item.a}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* ما لقيت إجابتك؟ */}
      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8 md:pb-20">
        <div className="cta-box rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] px-6 py-14 text-center text-[#f0e6d3] md:py-20">
          <h2 className="ds-font-heading text-3xl font-bold text-[#f0e6d3] md:text-5xl">{t("helpTitle")}</h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-[#f5ede0]/75">{t("helpText")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="ds-btn bg-[var(--brand-gold)] px-10 py-5 text-lg text-[#0f0d0a] hover:bg-[var(--brand-gold-light)]"
            >
              {t("contactCta")}
            </Link>
            <Link
              href="/products"
              className="ds-btn border border-[#f0e6d3]/30 px-10 py-5 text-lg text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5"
            >
              {t("shopCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}