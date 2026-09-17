import type { ProductListItem } from "@/services/products.service";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-500">
        <p>لا توجد منتجات تطابق بحثك حاليًا.</p>
        <p className="mt-1 text-sm">جرّب تعديل الفلاتر أو ابحث بكلمة أخرى.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}