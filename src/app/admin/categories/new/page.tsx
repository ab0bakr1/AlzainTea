import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/categories" className="text-sm text-stone-500 hover:text-stone-800">
          ← العودة إلى الفئات
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-stone-900">إضافة فئة جديدة</h1>
        <p className="mt-1 text-sm text-stone-500">أدخل بيانات الفئة بالعربية والإنجليزية</p>
      </div>
      <CategoryForm />
    </div>
  );
}