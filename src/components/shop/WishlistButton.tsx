"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToggleWishlist, useWishlistIds } from "@/hooks/useWishlist";

interface Props {
  productId: string;
  className?: string;
}

export default function WishlistButton({ productId, className = "" }: Props) {
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
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105 dark:bg-gray-800/90 ${className}`}
    >
      <Heart size={18} className={inWishlist ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-gray-300"} />
    </button>
  );
}