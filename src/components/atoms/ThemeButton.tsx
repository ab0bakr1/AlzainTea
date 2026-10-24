"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Sun, Moon } from "../../../public/assets/icons/icons";
export function ThemeToggle() {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative flex h-11 w-21 cursor-pointer items-center rounded-full border border-[var(--border-color-strong)] p-1 shadow-[var(--shadow-xs)] transition-[background-color,border-color,box-shadow,transform] duration-500 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] motion-reduce:transition-none md:h-9 md:w-18 ${
        isDark ? "bg-[var(--brand-ink-soft)]" : "bg-[var(--color-form)]"
      }`}
      aria-label={t("toggleTheme")}
      aria-pressed={isDark}
    >
      {/* المقبض: ذهب مطروق في الوضعين */}
      <span
        className={`ds-bg-gold absolute left-1.5 h-8 w-8 transform rounded-full shadow-[var(--shadow-gold)] transition-transform duration-500 motion-reduce:transition-none md:left-1 md:h-7 md:w-7 ${
          isDark ? "translate-x-9" : "translate-x-0"
        }`}
      />

      <span
        className={`absolute left-2 transform text-xs transition-transform duration-500 motion-reduce:transition-none md:left-1 ${
          isDark ? "translate-x-10" : "translate-x-1"
        }`}
      >
        {isDark ? (
          <Moon className="text-[var(--color-on-primary)]" />
        ) : (
          <Sun className="ml-0 text-[var(--color-on-primary)] md:ml-1" size={16} />
        )}
      </span>
    </button>
  );
}