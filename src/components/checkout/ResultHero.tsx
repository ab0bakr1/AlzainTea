// src/components/checkout/ResultHero.tsx
// عناصر العرض المشتركة لصفحات نتيجة الدفع (نجاح / فشل / إلغاء / انتظار).
// تصميم فقط: بلا منطق ولا hooks ولا نصوص ثابتة، فيعمل من Server Component
// (checkout/cancel/page.tsx) ومن Client Component (CheckoutResult.tsx).
// يتبع لغة الصفحة الرئيسية: هيرو داكن دائماً، نقاط تألق، وميدالية دائرية
// مأخوذة من كوب الشاي (حلقات متداخلة + ذهب خافت).

import type { ReactNode } from "react";

export type ResultTone = "success" | "failed" | "pending" | "info";

const STYLE = `
  .rs{
    --h-bg:var(--color-bg-alt);
    --h-surface:var(--color-form);
    --h-ink:var(--color-text-primary);
    --h-muted:var(--color-text-secondary);
    --h-accent:var(--color-accent-text);
    --h-r-lg:var(--radius-2xl);
    background:var(--h-bg);color:var(--h-ink);
  }
  /* الهيرو داكن دائماً في الوضعين، بنفس خلفية صندوق الدعوة في الرئيسية */
  .rs .rs-hero{
    --h-bg:#0f0d0a;--h-surface:#1a1612;--h-ink:#f0e6d3;--h-muted:#c4b49e;--h-accent:#d8c9a8;
    background-image:radial-gradient(rgba(240,230,211,.07) 1px,transparent 1px),linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
    background-size:22px 22px,auto;
    color:var(--h-ink);
  }
  @keyframes rs-steep{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes rs-draw{to{stroke-dashoffset:0}}
  @keyframes rs-spin{to{transform:rotate(360deg)}}
  @keyframes rs-twinkle{0%,100%{opacity:.08;transform:scale(.6)}50%{opacity:.45;transform:scale(1)}}
  .rs-medal{animation:rs-steep .9s cubic-bezier(.2,.7,.2,1) both}
  /* لحظة الحركة الوحيدة: العلامة تُرسم بعد ظهور الميدالية */
  .rs-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:rs-draw .6s .5s cubic-bezier(.4,0,.2,1) forwards}
  .rs-spin{transform-box:fill-box;transform-origin:center;animation:rs-spin 1.6s linear infinite}
  .rs-spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:rs-twinkle 5s ease-in-out infinite}
  @media (prefers-reduced-motion:reduce){
    .rs-medal{animation:none}
    .rs-draw{animation:none;stroke-dashoffset:0}
    .rs-spin{animation:none}
    .rs-spark{animation:none;opacity:.25}
  }
`;

/** أزرار الهيرو (الهيرو داكن دائماً فألوانها ثابتة بنفس أزرار الرئيسية) */
const focusCls =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0e6d3]";

export const resultBtn = {
  primary: `ds-btn bg-[#f0e6d3] px-8 py-4 text-[#0f0d0a] hover:bg-white ${focusCls}`,
  secondary: `ds-btn border border-[#f0e6d3]/30 px-8 py-4 text-[#f0e6d3] transition-colors hover:border-[#f0e6d3]/60 hover:bg-white/5 ${focusCls}`,
  ghost: `ds-btn px-6 py-4 text-[#c4b49e] transition-colors hover:text-[var(--brand-gold)] ${focusCls}`,
} as const;

/** بطاقة المحتوى تحت الهيرو (نفس بطاقات الرئيسية: radius-2xl + حد رملي) */
export const resultCard =
  "overflow-hidden rounded-[var(--h-r-lg)] border border-[var(--border-color)] bg-[var(--color-bg)] shadow-[var(--shadow-xs)]";

// نقاط تألق خافتة (زخرفة فقط)
const sparks = [
  { top: "20%", left: "12%", size: 3, delay: "0s" },
  { top: "70%", left: "86%", size: 3, delay: "1.6s" },
  { top: "34%", left: "92%", size: 3, delay: "2.6s" },
] as const;

const DISC: Record<ResultTone, string> = {
  success: "#5f7a4b", // ورق الشاي
  failed: "#a33a2e",
  pending: "#7a4f27", // لون الشاي في الكوب
  info: "#7a4f27",
};

function Medallion({ tone }: { tone: ResultTone }) {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id="rs-g" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </radialGradient>
        <radialGradient id="rs-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0.6" stopColor="#c9a45c" stopOpacity=".08" />
          <stop offset="1" stopColor="#c9a45c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#rs-glow)" />
      <circle cx="200" cy="200" r="180" fill="#1a1612" stroke="#f0e6d3" strokeOpacity=".12" strokeWidth="2" />
      <circle cx="200" cy="200" r="150" fill="#0f0d0a" stroke="#c9a45c" strokeOpacity=".3" strokeWidth="2" />
      {tone === "pending" && (
        <circle
          className="rs-spin"
          cx="200"
          cy="200"
          r="165"
          fill="none"
          stroke="#c9a45c"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="240 800"
        />
      )}
      <circle cx="200" cy="200" r="128" fill={DISC[tone]} />
      <circle cx="200" cy="200" r="128" fill="url(#rs-g)" />

      {tone === "success" && (
        <path
          className="rs-draw"
          pathLength={1}
          d="M142 204 L184 244 L262 156"
          fill="none"
          stroke="#f0e6d3"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {tone === "failed" && (
        <g fill="none" stroke="#f0e6d3" strokeWidth="18" strokeLinecap="round">
          <path className="rs-draw" pathLength={1} d="M158 158 L242 242" />
          <path className="rs-draw" pathLength={1} d="M242 158 L158 242" style={{ animationDelay: ".75s" }} />
        </g>
      )}

      {(tone === "pending" || tone === "info") && (
        <g fill="#5f7a4b">
          <ellipse cx="160" cy="185" rx="26" ry="10" transform="rotate(-30 160 185)" />
          <ellipse cx="228" cy="225" rx="24" ry="9" transform="rotate(35 228 225)" />
          <ellipse cx="205" cy="160" rx="20" ry="8" transform="rotate(75 205 160)" />
        </g>
      )}
    </svg>
  );
}

/** غلاف الصفحة: يعرّف متغيرات التصميم (.rs) مثل .home في الرئيسية. div وليس main لأن layout المتجر يحتوي main */
export function ResultShell({ children }: { children: ReactNode }) {
  return (
    <div className="rs">
      <style>{STYLE}</style>
      {children}
    </div>
  );
}

type HeroProps = {
  tone: ResultTone;
  title: string;
  refLabel?: string;
  refValue?: string | null;
  description?: ReactNode;
  note?: ReactNode;
  /** يُعلن تغيّر الحالة لقارئات الشاشة (حالة الانتظار والنجاح) */
  live?: boolean;
  /** الأزرار */
  children?: ReactNode;
};

export function ResultHero({ tone, title, refLabel, refValue, description, note, live, children }: HeroProps) {
  return (
    <div className="rs-hero relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {sparks.map((s, i) => (
          <span
            key={i}
            className="rs-spark"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
          />
        ))}
      </div>

      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-14 text-center md:px-8 md:pb-24 md:pt-20">
        <div aria-hidden className="rs-medal aspect-square w-36 md:w-44">
          <Medallion tone={tone} />
        </div>

        <div
          role={live ? "status" : undefined}
          aria-live={live ? "polite" : undefined}
          className="mt-8 flex flex-col items-center"
        >
          <h1 className="ds-font-heading max-w-[20ch] text-3xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-5xl md:leading-[1.15]">
            {title}
          </h1>

          {refValue && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-[rgba(240,230,211,.12)] bg-white/[.04] px-5 py-2 text-sm">
              {refLabel && <span className="text-[#c4b49e]">{refLabel}</span>}
              <span dir="ltr" className="font-mono font-semibold tabular-nums text-[var(--brand-gold-light)]">
                {refValue}
              </span>
            </p>
          )}

          {description && <p className="mt-6 max-w-prose text-lg leading-8 text-[#c4b49e]">{description}</p>}
          {note && <p className="mt-3 max-w-prose text-sm leading-7 text-[#f0e6d3]/60">{note}</p>}
        </div>

        {children && <div className="mt-9 flex flex-wrap justify-center gap-3">{children}</div>}
      </section>
    </div>
  );
}

/** هيكل التحميل بنفس أبعاد الهيرو (يُستخدم داخل CheckoutResult وكـ Suspense fallback) */
export function ResultHeroSkeleton({ label }: { label: string }) {
  return (
    <div className="rs-hero relative overflow-hidden" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <section
        aria-hidden
        className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20"
      >
        <div className="aspect-square w-36 animate-pulse rounded-full border border-[rgba(240,230,211,.12)] bg-white/[.04] md:w-44" />
        <div className="mt-8 h-10 w-64 max-w-full animate-pulse rounded-full bg-white/10 md:h-14 md:w-96" />
        <div className="mt-6 h-5 w-72 max-w-full animate-pulse rounded-full bg-white/[.06]" />
      </section>
    </div>
  );
}