import Link from "next/link";
import { categoryService } from "@/modules/categories/category.service";
import { listCategoriesQuerySchema } from "@/modules/categories/category.validators";
import { CategoriesTable } from "@/components/admin/CategoriesTable";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = listCategoriesQuerySchema.parse(sp);
  const { items } = await categoryService.list(filters);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">الفئات</h1>
          <p className="mt-1 text-sm text-stone-500">إدارة فئات وأقسام الشاي</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800"
        >
          + إضافة فئة
        </Link>
      </div>

      <CategoriesTable initialItems={JSON.parse(JSON.stringify(items))} />
    </div>
  );
}