"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  addToWishlist,
  fetchWishlist,
  fetchWishlistIds,
  removeFromWishlist,
} from "@/services/wishlist";

const IDS_KEY = ["wishlist", "ids"] as const;

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
  return useQuery({
    queryKey: ["wishlist", "list", page],
    queryFn: () => fetchWishlist(page),
    placeholderData: keepPreviousData,
  });
}

/** تبديل (Toggle) مع تحديث تفاؤلي فوري للقلب */
export function useToggleWishlist() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, inWishlist }: { productId: string; inWishlist: boolean }) =>
      inWishlist ? removeFromWishlist(productId) : addToWishlist(productId),

    onMutate: async ({ productId, inWishlist }) => {
      await qc.cancelQueries({ queryKey: IDS_KEY });
      const previous = qc.getQueryData<string[]>(IDS_KEY) ?? [];
      qc.setQueryData<string[]>(
        IDS_KEY,
        inWishlist ? previous.filter((id) => id !== productId) : [...previous, productId],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(IDS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}