import type { Metadata } from "next";
import MyWishlist from "@/components/shop/MyWishlist";

// صفحة خاصة بالعميل: لا تُفهرس في محركات البحث
export const metadata: Metadata = {
  title: "المفضلة | Wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <MyWishlist />
    </div>
  );
}