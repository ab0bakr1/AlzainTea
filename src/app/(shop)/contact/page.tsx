// src/app/(shop)/contact/page.tsx
// صفحة التواصل — Server Component، بنفس لغة تصميم الصفحة الرئيسية / عن المتجر.
// كل النصوص من ar.json / en.json (namespace: "contact"). النموذج في ContactForm (واجهة فقط).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, Mail, MessageCircle } from "lucide-react";
import ContactForm from "@/components/shop/ContactForm";

// TODO: استبدل هذه القيم ببيانات التواصل الحقيقية (نفس قيم Footer.tsx)
const CONTACT = {
  email: "info@alzaintea.com",
  whatsappDisplay: "+966 50 000 0000",
  whatsappUrl: "https://wa.me/966500000000",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  const brand = await getTranslations("brand");
  return {
    title: `${t("title")} | ${brand("name")}`,
    description: t("subtitle"),
  };
}

// نقاط تألق خافتة في الـ Hero (زخرفة CSS فقط)
const sparks = [
  { top: "24%", left: "10%", size: 3, delay: "0s" },
  { top: "70%", left: "48%", size: 3, delay: "1.4s" },
  { top: "32%", left: "90%", size: 3, delay: "2.4s" },
] as const;

function InfoRow({
  icon,
  label,
  children,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[var(--brand-gold)]"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-[#c4b49e]">{label}</span>
        <span className="mt-1 block break-words font-semibold text-[#f0e6d3]">{children}</span>
      </span>
    </>
  );

  const base =
    "flex items-center gap-4 rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] bg-[var(--h-glass)] p-5 backdrop-blur-sm";

  if (!href) return <div className={base}>{inner}</div>;

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${base} transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[rgba(201,164,92,0.45)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0e6d3]`}
    >
      {inner}
    </a>
  );
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <main className="contact bg-[var(--h-bg)] text-[var(--h-ink)]">
      <style>{`
        .contact{
          --h-bg:var(--color-bg-alt);
          --h-ink:var(--color-text-primary);
          --h-muted:var(--color-text-secondary);
          --h-r-lg:var(--radius-2xl);
          --h-glass:rgba(255,255,255,.04);
          --h-glass-border:rgba(240,230,211,.12);
          --gradient-hero:linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
        }
        /* الـ Hero داكن دائماً في الوضعين */
        .contact .hero{
          --h-ink:#f0e6d3;--h-muted:#c4b49e;
          background:var(--gradient-hero);color:var(--h-ink);
        }
        @keyframes twinkle{0%,100%{opacity:.08;transform:scale(.6)}50%{opacity:.45;transform:scale(1)}}
        .spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:twinkle 5s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.spark{animation:none;opacity:.25}}
      `}</style>

      {/* Hero صغير */}
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
          <h1 className="ds-font-heading text-4xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-6xl md:leading-[1.15]">
            {t("title")}
          </h1>
          <span aria-hidden className="mt-5 block h-[2px] w-12 rounded-full bg-[var(--brand-gold)]/60" />
          <p className="mt-6 max-w-prose text-lg leading-8 text-[var(--h-muted)]">{t("subtitle")}</p>
        </section>
      </div>

      {/* النموذج + طرق التواصل */}
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_.8fr] lg:gap-10">
          {/* نموذج التواصل */}
          <div className="rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-sm)] md:p-10">
            <h2 className="text-2xl font-bold md:text-3xl">{t("formTitle")}</h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
            <p className="mt-5 mb-8 leading-8 text-[var(--h-muted)]">{t("formHint")}</p>
            <ContactForm />
          </div>

          {/* معلومات الاتصال */}
          <aside
            aria-labelledby="contact-info-title"
            className="cta-info rounded-[var(--h-r-lg)] border border-[var(--h-glass-border)] p-6 text-[#f0e6d3] md:p-8 lg:sticky lg:top-28"
            style={{
              backgroundImage:
                "radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),var(--gradient-hero)",
              backgroundSize: "22px 22px,auto",
            }}
          >
            <h2 id="contact-info-title" className="ds-font-heading text-2xl font-bold text-[#f0e6d3] md:text-3xl">
              {t("infoTitle")}
            </h2>
            <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[#f0e6d3]/25" />

            <div className="mt-8 grid gap-4">
              <InfoRow icon={<Mail size={22} />} label={t("emailLabel")} href={`mailto:${CONTACT.email}`}>
                <span dir="ltr" className="inline-block">
                  {CONTACT.email}
                </span>
              </InfoRow>

              <InfoRow
                icon={<MessageCircle size={22} />}
                label={t("phoneLabel")}
                href={CONTACT.whatsappUrl}
                external
              >
                <span dir="ltr" className="inline-block">
                  {CONTACT.whatsappDisplay}
                </span>
              </InfoRow>

              <InfoRow icon={<Clock size={22} />} label={t("hoursLabel")}>
                {t("hoursValue")}
              </InfoRow>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}