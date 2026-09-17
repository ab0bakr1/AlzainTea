"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { productsService, type ProductListItem } from "@/services/products.service";

const statusLabel: Record<string, { text: string; className: string }> = {
  DRAFT: { text: "مسودة", className: "bg-stone-100 text-stone-600" },
  ACTIVE: { text: "نشط", className: "bg-emerald-100 text-emerald-700" },
  ARCHIVED: { text: "مؤرشف", className: "bg-amber-100 text-amber-700" },
  OUT_OF_STOCK: { text: "نفدت الكمية", className: "bg-red-100 text-red-700" },
};

export function ProductsTable({ initialItems }: { initialItems: ProductListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    setDeletingId(id);
    try {
      await productsService.remove(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch {
      alert("تعذّر حذف المنتج، قد يكون مرتبطًا بطلبات سابقة");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-stone-500">
        لا توجد منتجات بعد. ابدأ بإضافة أول منتج.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        <thead className="bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3 text-start font-medium">المنتج</th>
            <th className="px-4 py-3 text-start font-medium">الفئة</th>
            <th className="px-4 py-3 text-start font-medium">السعر</th>
            <th className="px-4 py-3 text-start font-medium">المخزون المتاح</th>
            <th className="px-4 py-3 text-start font-medium">الحالة</th>
            <th className="px-4 py-3 text-start font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((p) => {
            const available = p.stock - p.reservedStock;
            const status = statusLabel[p.status] ?? statusLabel.DRAFT;
            return (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-stone-800">{p.nameAr}</div>
                  <div className="text-xs text-stone-500">{p.nameEn}</div>
                </td>
                <td className="px-4 py-3 text-stone-600">{p.category?.nameAr}</td>
                <td className="px-4 py-3 text-stone-600">${Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-3 text-stone-600">{available}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${status.className}`}>
                    {status.text}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      تعديل
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === p.id ? "جارٍ الحذف..." : "حذف"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}