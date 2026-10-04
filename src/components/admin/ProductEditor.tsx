"use client";

import Link from "next/link";
import { useAdminProduct } from "@/hooks/useAdminProducts";
import { extractApiError } from "@/services/products.service";
import { ProductForm } from "./ProductForm";

export function ProductEditor({ productId }: { productId: string }) {
  const { data, isLoading, isError, error } = useAdminProduct(productId);

  if (isLoading) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="h-10 w-1/3 animate-pulse rounded bg-stone-100" />
        <div className="h-64 animate-pulse rounded-lg bg-stone-100" />
        <div className="h-40 animate-pulse rounded-lg bg-stone-100" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">{extractApiError(error, "تعذّر تحميل المنتج")}</p>
        <Link
          href="/admin/products"
          className="mt-3 inline-block text-emerald-700 hover:underline"
        >
          العودة إلى المنتجات
        </Link>
      </div>
    );
  }

  return <ProductForm key={data.id} product={data} />;
}