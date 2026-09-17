import { notFound } from "next/navigation";
import { productService } from "@/modules/products/product.service";
import { ProductForm } from "@/components/admin/ProductForm";
import { ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await productService.getById(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">تعديل المنتج</h1>
        <p className="mt-1 text-sm text-stone-500">{product.nameAr}</p>
      </div>
      <ProductForm
        productId={product.id}
        initialValues={{
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          slug: product.slug,
          descAr: product.descAr,
          descEn: product.descEn,
          price: String(product.price),
          compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
          stock: String(product.stock),
          sku: product.sku,
          images: product.images.join("\n"),
          status: product.status,
          categoryId: product.categoryId,
        }}
      />
    </div>
  );
}