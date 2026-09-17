"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoriesService, type CategoryItem } from "@/services/categories.service";

export function CategoriesTable({ initialItems }: { initialItems: CategoryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الفئة؟")) return;
    setDeletingId(id);
    setErrorId(null);
    try {
      await categoriesService.remove(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch {
      setErrorId(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-stone-500">
        لا توجد فئات بعد. ابدأ بإضافة أول فئة.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        <thead className="bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3 text-start font-medium">الفئة</th>
            <th className="px-4 py-3 text-start font-medium">الفئة الأب</th>
            <th className="px-4 py-3 text-start font-medium">عدد المنتجات</th>
            <th className="px-4 py-3 text-start font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-stone-800">{c.nameAr}</div>
                <div className="text-xs text-stone-500">{c.nameEn}</div>
              </td>
              <td className="px-4 py-3 text-stone-600">
                {(c as CategoryItem & { parent?: { nameAr: string } }).parent?.nameAr ?? "—"}
              </td>
              <td className="px-4 py-3 text-stone-600">{c._count?.products ?? 0}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/categories/${c.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      تعديل
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === c.id ? "جارٍ الحذف..." : "حذف"}
                    </button>
                  </div>
                  {errorId === c.id && (
                    <span className="text-xs text-red-600">
                      لا يمكن حذف فئة تحتوي على منتجات
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}