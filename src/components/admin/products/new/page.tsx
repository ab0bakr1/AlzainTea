import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">إضافة منتج جديد</h1>
        <p className="mt-1 text-sm text-stone-500">أدخل بيانات المنتج بالعربية والإنجليزية</p>
      </div>
      <ProductForm />
    </div>
  );
}