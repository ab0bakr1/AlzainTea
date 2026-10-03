"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  addToWishlist,
  fetchWishlist,
  fetchWishlistIds,
  removeFromWishlist,
  type WishlistPageData,
} from "@/services/wishlist";

const ROOT_KEY = ["wishlist"] as const;
const IDS_KEY = ["wishlist", "ids"] as const;
const LIST_KEY = ["wishlist", "list"] as const;

export function useWishlistIds() {
  const { status } = useSession();
  return useQuery({
    queryKey: IDS_KEY,
    queryFn: fetchWishlistIds,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useWishlistItems(page: number) {
  const { status } = useSession();
  return useQuery({
    queryKey: [...LIST_KEY, page],
    queryFn: () => fetchWishlist(page),
    enabled: status === "authenticated",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * تبديل (Toggle) مع تحديث تفاؤلي فوري:
 * - يحدّث أيقونة القلب (قائمة المعرفات)
 * - ويُخفي العنصر فوراً من صفحة المفضلة عند الإزالة
 * مع تراجع تلقائي عند الفشل ومزامنة مع الخادم عند الانتهاء.
 */
export function useToggleWishlist() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, inWishlist }: { productId: string; inWishlist: boolean }) =>
      inWishlist ? removeFromWishlist(productId) : addToWishlist(productId),

    onMutate: async ({ productId, inWishlist }) => {
      await qc.cancelQueries({ queryKey: ROOT_KEY });

      const previousIds = qc.getQueryData<string[]>(IDS_KEY);
      const previousLists = qc.getQueriesData<WishlistPageData>({ queryKey: LIST_KEY });

      qc.setQueryData<string[]>(IDS_KEY, (old = []) =>
        inWishlist
          ? old.filter((id) => id !== productId)
          : old.includes(productId)
            ? old
            : [...old, productId],
      );

      if (inWishlist) {
        qc.setQueriesData<WishlistPageData>({ queryKey: LIST_KEY }, (old) => {
          if (!old) return old;
          const items = old.items.filter((e) => e.product.id !== productId);
          if (items.length === old.items.length) return old;
          return { ...old, items, meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) } };
        });
      }

      return { previousIds, previousLists };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.previousIds) qc.setQueryData(IDS_KEY, ctx.previousIds);
      ctx.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}