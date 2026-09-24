import axios from "axios";
import type { PageMeta } from "./reviews";

export interface WishlistProduct {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number; // USD
  compareAtPrice: number | null;
  image: string | null;
  status: string;
  available: number;
}

export interface WishlistEntry {
  addedAt: string;
  product: WishlistProduct;
}

export async function fetchWishlistIds(): Promise<string[]> {
  const res = await axios.get("/api/wishlist", { params: { idsOnly: "true" } });
  return res.data.data.productIds as string[];
}

export async function fetchWishlist(page: number, limit = 12) {
  const res = await axios.get("/api/wishlist", { params: { page, limit } });
  return { items: res.data.data.items as WishlistEntry[], meta: res.data.meta as PageMeta };
}

export async function addToWishlist(productId: string) {
  await axios.post("/api/wishlist", { productId });
}

export async function removeFromWishlist(productId: string) {
  await axios.delete("/api/wishlist", { params: { productId } });
}