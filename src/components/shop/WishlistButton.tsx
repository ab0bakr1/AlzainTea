"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useToggleWishlist, useWishlistIds } from "@/hooks/useWishlist";

interface Props {
  productId: string;
  className?: string;
}

export default function WishlistButton({ productId, className = "" }: Props) {
  const t = useTranslations("wishlist");
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { data: ids = [] } = useWishlistIds();
  const toggle = useToggleWishlist();

  const inWishlist = ids.includes(productId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // الزر داخل بطاقة قابلة للنقر (Link)
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    toggle.mutate({ productId, inWishlist });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? t("remove") : t("add")}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--color-bg)]/90 text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)] backdrop-blur-sm transition-[transform,border-color,color] duration-200 hover:scale-105 hover:border-[var(--border-color-gold)] hover:bg-[var(--color-primary-200)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)] disabled:opacity-60 ${className}`}
    >
      <Heart
        size={18}
        className={inWishlist ? "fill-[var(--color-danger)] text-[var(--color-danger)]" : "text-current"}
      />
    </button>
  );
}