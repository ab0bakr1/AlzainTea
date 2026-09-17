import Link from "next/link";
import { productService } from "@/modules/products/product.service";
import { listProductsQuerySchema } from "@/modules/products/product.validators";
import { ProductsTable } from "@/components/admin/ProductsTable";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = listProductsQuerySchema.parse(sp);
  const { items } = await productService.list(filters, { publicOnly: false });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">المنتجات</h1>
          <p className="mt-1 text-sm text-stone-500">إدارة منتجات متجر الزين للشاي</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800"
        >
          + إضافة منتج
        </Link>
      </div>

      {/* JSON.parse/stringify يحوّل Decimal إلى نص/رقم آمن للتمرير إلى مكوّن Client */}
      <ProductsTable initialItems={JSON.parse(JSON.stringify(items))} />
    </div>
  );
}