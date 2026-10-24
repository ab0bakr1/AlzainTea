// src/components/organisms/Footer.tsx
// فوتر المتجر — Server Component (تصميم فقط، بنفس لغة الصفحة الرئيسية)
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Leaf, Mail, MessageCircle, TextAlignCenter } from "lucide-react";

// TODO: استبدل هذه القيم ببيانات التواصل الحقيقية للمتجر
const CONTACT = {
  whatsapp: "https://wa.me/966500000000",
  email: "mailto:info@alzaintea.com",
  instagram: "https://instagram.com/alzaintea",
} as const;

const GLASS_BORDER = "border-[rgba(240,230,211,.12)]";

const linkCls =
  "inline-block text-[#f0e6d3]/70 transition-colors duration-200 hover:text-[var(--brand-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0e6d3]";

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-[#f0e6d3]">{children}</h3>
      <span aria-hidden className="mt-3 block h-[2px] w-8 rounded-full bg-[#f0e6d3]/25" />
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-[#f0e6d3]/70 transition-colors group-hover:text-[var(--brand-gold)]"
    >
      {children}
    </span>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function PayChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li
      role="img"
      aria-label={label}
      dir="ltr"
      className={`flex h-11 min-w-16 items-center justify-center rounded-lg border ${GLASS_BORDER} bg-white/[0.04] px-3 text-[#f0e6d3]/85`}
    >
      {children}
    </li>
  );
}

const svgText = {
  fill: "currentColor",
  textAnchor: "middle" as const,
  fontFamily: "Arial, Helvetica, sans-serif",
};

export default async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const brand = await getTranslations("brand");
  const year = String(new Date().getFullYear());

  const quickLinks = [
    { href: "/products", label: nav("products") },
    { href: "/#categories", label: nav("categories") },
    { href: "/about", label: nav("about") },
  ];

  const serviceLinks = [
    { href: "/faq", label: nav("faq") },
    { href: "/contact", label: nav("contact") },
  ];

  return (
    <footer className={`border-t ${GLASS_BORDER} bg-[var(--brand-ink)] text-[#f0e6d3]`}>
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* الشعار والوصف */}
          <div className="md:col-span-2 lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0e6d3]"
            >
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(201,164,92,0.45)] bg-white/[0.04] text-[var(--brand-gold)]"
              >
                <Leaf size={22} />
              </span>
              <span className="ds-font-heading text-2xl font-bold text-[#f0e6d3]">
                {brand("name")}
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#c4b49e]">{t("about")}</p>
          </div>

          {/* روابط سريعة */}
          <nav aria-label={t("quickLinks")} className="lg:col-span-2">
            <ColumnTitle>{t("quickLinks")}</ColumnTitle>
            <ul className="space-y-3 text-sm">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* خدمة العملاء والتواصل */}
          <nav aria-label={t("customerService")} className="lg:col-span-3">
            <ColumnTitle>{t("customerService")}</ColumnTitle>
            <ul className="space-y-3 text-sm">
              {serviceLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <div className="flex flex-col gap-5 pt-2 rtl:flex-row ltr:flex-row-reverse md:flex-row items-center" style={{ textAlign: "-webkit-center" }}>
                <li>
                  <a
                    href={CONTACT.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 ${linkCls}`}
                  >
                    <IconBubble>
                      <MessageCircle size={20} />
                    </IconBubble>
                    <span>{t("whatsapp")}</span>
                  </a>
                </li>
                <li>
                  <a href={CONTACT.email} className={`group flex items-center gap-3 ${linkCls}`}>
                    <IconBubble>
                      <Mail size={20} />
                    </IconBubble>
                    <span>{t("email")}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={CONTACT.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 ${linkCls}`}
                  >
                    <IconBubble>
                      <InstagramIcon />
                    </IconBubble>
                    <span>{t("instagram")}</span>
                  </a>
                </li>
              </div>
            </ul>
          </nav>

          {/* وسائل الدفع */}
          <div className="lg:col-span-3">
            <ColumnTitle>{t("paymentMethods")}</ColumnTitle>
            <ul className="flex flex-wrap gap-3">
              <PayChip label="Visa">
                <svg width="44" height="16" viewBox="0 0 44 16" aria-hidden>
                  <text x="22" y="13" fontSize="15" fontWeight="800" fontStyle="italic" letterSpacing="0.5" {...svgText}>
                    VISA
                  </text>
                </svg>
              </PayChip>
              <PayChip label="Mastercard">
                <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden>
                  <circle cx="12" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="22" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </PayChip>
              <PayChip label="mada">
                <svg width="44" height="16" viewBox="0 0 44 16" aria-hidden>
                  <text x="22" y="13" fontSize="14" fontWeight="700" {...svgText}>
                    mada
                  </text>
                </svg>
              </PayChip>
              <PayChip label="Apple Pay">
                <svg width="58" height="16" viewBox="0 0 58 16" aria-hidden>
                  <text x="29" y="13" fontSize="13" fontWeight="600" {...svgText}>
                    Apple Pay
                  </text>
                </svg>
              </PayChip>
              <PayChip label="Stripe">
                <svg width="44" height="16" viewBox="0 0 44 16" aria-hidden>
                  <text x="22" y="13" fontSize="14" fontWeight="700" {...svgText}>
                    stripe
                  </text>
                </svg>
              </PayChip>
            </ul>
          </div>
        </div>

        <hr aria-hidden className="ds-gold-rule mt-14 opacity-40" />

        <p className="mt-8 text-center text-sm text-[#f0e6d3]/50">
          {t("copyright", { year })}
        </p>
      </div>
    </footer>
  );
}