"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { productsService } from "@/services/products.service";
import { categoriesService, type CategoryItem } from "@/services/categories.service";
import { useEffect } from "react";

type Status = "DRAFT" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";

interface ProductFormValues {
  nameAr: string;
  nameEn: string;
  slug: string;
  descAr: string;
  descEn: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  images: string; // سطر لكل رابط
  status: Status;
  categoryId: string;
}

const emptyValues: ProductFormValues = {
  nameAr: "",
  nameEn: "",
  slug: "",
  descAr: "",
  descEn: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  sku: "",
  images: "",
  status: "DRAFT",
  categoryId: "",
};

export function ProductForm({
  productId,
  initialValues,
}: {
  productId?: string;
  initialValues?: Partial<ProductFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({ ...emptyValues, ...initialValues });
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoriesService.list({ limit: 100 }).then((res) => setCategories(res.data));
  }, []);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      nameAr: values.nameAr,
      nameEn: values.nameEn,
      slug: values.slug,
      descAr: values.descAr,
      descEn: values.descEn,
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : null,
      stock: Number(values.stock),
      sku: values.sku,
      images: values.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      status: values.status,
      categoryId: values.categoryId,
    };

    try {
      if (productId) {
        await productsService.update(productId, payload);
      } else {
        await productsService.create(payload);
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? "حدث خطأ أثناء حفظ المنتج";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 max-w-3xl">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم بالعربية">
          <input
            required
            value={values.nameAr}
            onChange={(e) => update("nameAr", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
        <Field label="الاسم بالإنجليزية">
          <input
            required
            value={values.nameEn}
            onChange={(e) => update("nameEn", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
      </div>

      <Field label="الرابط (Slug)">
        <input
          required
          dir="ltr"
          placeholder="ceylon-black-tea"
          value={values.slug}
          onChange={(e) => update("slug", e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الوصف بالعربية">
          <textarea
            required
            rows={4}
            value={values.descAr}
            onChange={(e) => update("descAr", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
        <Field label="الوصف بالإنجليزية">
          <textarea
            required
            rows={4}
            value={values.descEn}
            onChange={(e) => update("descEn", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="السعر (USD)">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
        <Field label="السعر قبل الخصم (اختياري)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.compareAtPrice}
            onChange={(e) => update("compareAtPrice", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
        <Field label="المخزون">
          <input
            required
            type="number"
            min="0"
            value={values.stock}
            onChange={(e) => update("stock", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رمز SKU">
          <input
            required
            dir="ltr"
            value={values.sku}
            onChange={(e) => update("sku", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </Field>
        <Field label="الفئة">
          <select
            required
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="">اختر فئة</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} / {c.nameEn}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="روابط الصور (رابط واحد في كل سطر)">
        <textarea
          required
          rows={3}
          dir="ltr"
          value={values.images}
          onChange={(e) => update("images", e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          placeholder={"https://.../image1.jpg\nhttps://.../image2.jpg"}
        />
      </Field>

      <Field label="الحالة">
        <select
          value={values.status}
          onChange={(e) => update("status", e.target.value as Status)}
          className="w-full max-w-xs rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        >
          <option value="DRAFT">مسودة</option>
          <option value="ACTIVE">نشط</option>
          <option value="ARCHIVED">مؤرشف</option>
          <option value="OUT_OF_STOCK">نفدت الكمية</option>
        </select>
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-5 py-2 text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "جارٍ الحفظ..." : productId ? "حفظ التعديلات" : "إنشاء المنتج"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-md border border-stone-300 px-5 py-2 text-stone-700 hover:bg-stone-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}