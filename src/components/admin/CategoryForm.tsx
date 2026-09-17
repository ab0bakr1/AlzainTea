"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { categoriesService, type CategoryItem } from "@/services/categories.service";

interface CategoryFormValues {
  nameAr: string;
  nameEn: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
}

const emptyValues: CategoryFormValues = {
  nameAr: "",
  nameEn: "",
  slug: "",
  description: "",
  image: "",
  parentId: "",
};

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function CategoryForm({
  categoryId,
  initialValues,
}: {
  categoryId?: string;
  initialValues?: Partial<CategoryFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>({ ...emptyValues, ...initialValues });
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoriesService.list({ limit: 100 }).then((res) =>
      setAllCategories(res.data.filter((c) => c.id !== categoryId))
    );
  }, [categoryId]);

  function update<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
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
      description: values.description || null,
      image: values.image || null,
      parentId: values.parentId || null,
    };

    try {
      if (categoryId) {
        await categoriesService.update(categoryId, payload);
      } else {
        await categoriesService.create(payload);
      }
      router.push("/admin/categories");
      router.refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? "حدث خطأ أثناء حفظ الفئة";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 max-w-2xl">
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
            className={inputClass}
          />
        </Field>
        <Field label="الاسم بالإنجليزية">
          <input
            required
            value={values.nameEn}
            onChange={(e) => update("nameEn", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="الرابط (Slug)">
        <input
          required
          dir="ltr"
          placeholder="black-tea"
          value={values.slug}
          onChange={(e) => update("slug", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="الوصف (اختياري)">
        <textarea
          rows={3}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="رابط الصورة (اختياري)">
        <input
          dir="ltr"
          value={values.image}
          onChange={(e) => update("image", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="الفئة الأب (اختياري)">
        <select
          value={values.parentId}
          onChange={(e) => update("parentId", e.target.value)}
          className={inputClass}
        >
          <option value="">بدون فئة أب</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr} / {c.nameEn}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-5 py-2 text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "جارٍ الحفظ..." : categoryId ? "حفظ التعديلات" : "إنشاء الفئة"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/categories")}
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