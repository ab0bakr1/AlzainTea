// app/components/LocaleSwitcher.tsx
"use client";
import { useEffect } from "react";
import { Locale, useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Props = {
  changeLocaleAction: (locale: Locale) => Promise<void>;
};

export default function LocaleSwitcher({ changeLocaleAction }: Props) {
  const locale = useLocale();
  const t = useTranslations("nav");
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  const nextLocale = locale === "en" ? "ar" : "en";
  // دائرة ذهب مطروق + نص أسود العبوة، بنفس لغة أزرار الصفحة الرئيسية
  const baseClasses = `
    fixed
    bottom-4
    right-4
    z-50
    flex
    h-14
    w-14
    cursor-pointer
    items-center
    justify-center
    rounded-full
    border
    border-[var(--brand-gold-deep)]/40
    ds-bg-gold
    text-sm
    font-bold
    tracking-wide
    shadow-[var(--shadow-gold)]
    transition-[transform,box-shadow]
    duration-200
    ease-out
    hover:-translate-y-0.5
    hover:shadow-[0_14px_34px_rgba(201,164,92,0.5)]
    active:translate-y-px
    motion-reduce:transition-none
    motion-reduce:transform-none
  `;
  return (
    <button
      type="button"
      onClick={() => changeLocaleAction(nextLocale)}
      aria-label={t("switchLanguage")}
      lang={nextLocale}
      className={cn(baseClasses)}
    >
      {t("localeCode")}
    </button>
  );
}