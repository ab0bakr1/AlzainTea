"use client";
// src/app/not-found.tsx
// صفحة 404 — تصميم فقط، بنفس لغة الصفحة الرئيسية (Luxe Desert Modernism)
import "./globals.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false },
);

// نقاط تألق خافتة (زخرفة CSS فقط) — نفس فكرة الـ Hero
const sparks = [
  { top: "16%", left: "12%", size: 3, delay: "0s" },
  { top: "72%", left: "20%", size: 3, delay: "1.8s" },
  { top: "30%", left: "88%", size: 3, delay: "2.8s" },
  { top: "78%", left: "82%", size: 3, delay: "0.9s" },
] as const;

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="nf ds-bg-dune relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16 text-[var(--color-text-primary)]">
      <style>{`
        @keyframes nf-steep{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes nf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes nf-twinkle{0%,100%{opacity:.1;transform:scale(.6)}50%{opacity:.6;transform:scale(1)}}
        .nf-enter{animation:nf-steep 1.1s cubic-bezier(.2,.7,.2,1) both}
        .nf-float{animation:nf-float 7s ease-in-out infinite}
        .nf-spark{position:absolute;border-radius:9999px;background:var(--brand-gold);animation:nf-twinkle 5s ease-in-out infinite}
        /* حد رفيع بالذهب الغامق يحفظ وضوح الرقم فوق الخلفية الفاتحة */
        .nf-code{-webkit-text-stroke:1px rgba(143,109,43,.45)}
        :root.dark .nf-code{-webkit-text-stroke:0}
        @media (prefers-reduced-motion:reduce){.nf-enter,.nf-float{animation:none}.nf-spark{animation:none;opacity:.3}}
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {sparks.map((s, i) => (
          <span
            key={i}
            className="nf-spark"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      <section className="relative flex w-full max-w-xl flex-col items-center text-center">
        <p
          aria-hidden
          className="nf-code ds-text-gold ds-font-heading -mt-6 select-none text-[7rem] font-extrabold leading-none md:-mt-8 md:text-[10rem]"
        >
          {t("code")}
        </p>

        <h1 className="ds-font-heading -mt-2 text-3xl font-bold md:text-5xl">
          {t("title")}
        </h1>
        <span
          aria-hidden
          className="mt-4 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]"
        />
        <p className="mt-5 max-w-md text-base leading-8 text-[var(--color-text-secondary)] md:text-lg">
          {t("description")}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="ds-btn ds-btn-primary px-8 py-4">
            {t("home")}
          </Link>
          <Link href="/products" className="ds-btn ds-btn-outline px-8 py-4">
            {t("browse")}
          </Link>
        </div>
      </section>
    </main>
  );
}