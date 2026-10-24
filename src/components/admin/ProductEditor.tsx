"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAdminProduct } from "@/hooks/useAdminProducts";
import { extractApiError } from "@/services/products.service";
import { ProductForm } from "./ProductForm";

export function ProductEditor({ productId }: { productId: string }) {
  const t = useTranslations("adminPanel.productForm");
  const { data, isLoading, isError, error } = useAdminProduct(productId);

  if (isLoading) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="adm-skeleton h-10 w-1/3" />
        <div className="adm-skeleton h-64" />
        <div className="adm-skeleton h-40" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="adm-alert adm-alert-error p-8 text-center">
        <p>{extractApiError(error, t("loadError"))}</p>
        <Link href="/admin/products" className="mt-3 inline-block underline underline-offset-2">
          {t("backToProducts")}
        </Link>
      </div>
    );
  }

  return <ProductForm key={data.id} product={data} />;
}