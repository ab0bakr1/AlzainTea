import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categoryService } from "@/modules/categories/category.service";
import { productService } from "@/modules/products/product.service";
import { listProductsQuerySchema } from "@/modules/products/product.validators";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { ApiError } from "@/lib/api-response";

export const revalidate = 60;

async function getCategory(slug: string) {
  try {
    return await categoryService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "الفئة غير موجودة" };
  return {
    title: `${category.nameAr} | متجر الزين للشاي`,
    description: category.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const filters = listProductsQuerySchema.parse({ ...sp, category: slug });
  const { items } = await productService.list(filters, { publicOnly: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">{category.nameAr}</h1>
        {category.description && (
          <p className="mt-1 max-w-2xl text-stone-500">{category.description}</p>
        )}
      </div>

      <div className="mb-6">
        <ProductFilters />
      </div>

      <ProductGrid products={JSON.parse(JSON.stringify(items))} />
    </div>
  );
}