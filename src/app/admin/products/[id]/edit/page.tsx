// src/app/admin/products/[id]/page.tsx
import Link from "next/link";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const metadata = { title: "تعديل منتج" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/products" className="text-sm text-stone-500 hover:underline">
          المنتجات
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-800">تعديل المنتج</h1>
      </div>
      <ProductEditor productId={id} />
    </div>
  );
}