// src/app/admin/products/new/page.tsx
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "إضافة منتج" };

export default function NewProductPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/products" className="text-sm text-stone-500 hover:underline">
          المنتجات
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-800">إضافة منتج</h1>
      </div>
      <ProductForm />
    </div>
  );
}