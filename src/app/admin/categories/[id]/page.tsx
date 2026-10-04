import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryService } from "@/modules/categories/category.service";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let category;
  try {
    category = await categoryService.getById(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/categories" className="text-sm text-stone-500 hover:text-stone-800">
          ← العودة إلى الفئات
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-stone-900">تعديل الفئة</h1>
        <p className="mt-1 text-sm text-stone-500">{category.nameAr}</p>
      </div>
      <CategoryForm
        categoryId={category.id}
        initialValues={{
          nameAr: category.nameAr,
          nameEn: category.nameEn,
          slug: category.slug,
          description: category.description ?? "",
          image: category.image ?? "",
          parentId: category.parentId ?? "",
        }}
        stats={{
          productsCount: category._count.products,
          childrenCount: category._count.children,
        }}
      />
    </div>
  );
}