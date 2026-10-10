// src/components/molecules/navbar/CartLink.tsx
// أيقونة السلة مع عدّاد الكميات (تقرأ من cart-store مباشرة)

"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { iconButton } from "./auth-styles";

const subscribeNoop = () => () => {};
// false على الخادم وأثناء الـ hydration، true بعده — يمنع اختلاف HTML بين الخادم والمتصفح
function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export default function CartLink() {
  const t = useTranslations("nav");
  const isClient = useIsClient();
  const count = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const shown = isClient ? count : 0;

  return (
    <Link href="/cart" className={iconButton} aria-label={`${t("cart")} (${shown})`}>
      <ShoppingBag aria-hidden size={22} />
      {shown > 0 && (
        <span
          aria-hidden
          className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1 text-[11px] font-bold leading-none text-[var(--color-text-primary-dark)]"
        >
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}