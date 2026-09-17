import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">إضافة فئة جديدة</h1>
        <p className="mt-1 text-sm text-stone-500">أدخل بيانات الفئة بالعربية والإنجليزية</p>
      </div>
      <CategoryForm />
    </div>
  );
}