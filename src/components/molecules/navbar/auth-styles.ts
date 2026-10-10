// src/components/molecules/navbar/auth-styles.ts
// أنماط مشتركة لأزرار وقوائم المصادقة في الهيدر (تعتمد على متغيرات variables.css)

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

const btn = `inline-flex items-center justify-center rounded-xl font-medium transition ${focusRing}`;

export const btnOutline = `${btn} border border-[var(--color-primary)] ds-text-alt hover:bg-[var(--color-bg-alt)]`;
export const btnPrimary = `${btn} ds-bg-primary text-white hover:opacity-90`;

export const btnSizeDesktop = "h-10 px-4 text-sm";
export const btnSizeMobile = "h-12 w-full px-5 text-base";

export const menuItemBase =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-[var(--color-bg-alt)] focus-visible:bg-[var(--color-bg-alt)] focus-visible:outline-none";

export const iconButton = `relative inline-flex h-10 w-10 items-center justify-center rounded-xl ds-text-primary transition-colors hover:bg-[var(--color-bg-alt)] ${focusRing}`;