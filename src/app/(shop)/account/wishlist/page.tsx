import MyWishlist from "@/components/shop/MyWishlist";

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">المفضلة | Wishlist</h1>
      <MyWishlist />
    </div>
  );
}