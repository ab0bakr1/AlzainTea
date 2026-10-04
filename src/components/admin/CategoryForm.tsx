"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminCategoryOptions,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/useAdminCategories";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CategoryOption, CategoryPayload } from "@/services/categories.service";

// ---------------------------------------------------------------------------
// حالة النموذج والتحويل إلى الـ payload
// ---------------------------------------------------------------------------

interface CategoryFormValues {
  nameAr: string;
  nameEn: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
}

const EMPTY_VALUES: CategoryFormValues = {
  nameAr: "",
  nameEn: "",
  slug: "",
  description: "",
  image: "",
  parentId: "",
};

function toPayload(v: CategoryFormValues): CategoryPayload {
  return {
    nameAr: v.nameAr.trim(),
    nameEn: v.nameEn.trim(),
    slug: v.slug.trim().toLowerCase(),
    description: v.description.trim() || null,
    image: v.image.trim() || null,
    parentId: v.parentId || null,
  };
}

/** التعديل يرسل الحقول المتغيّرة فقط */
function buildChanges(current: CategoryPayload, initial: CategoryPayload): Partial<CategoryPayload> {
  const changes: Partial<CategoryPayload> = {};
  (Object.keys(current) as (keyof CategoryPayload)[]).forEach((key) => {
    if (current[key] !== initial[key]) {
      Object.assign(changes, { [key]: current[key] });
    }
  });
  return changes;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * خيارات الفئة الأب: تستبعد الفئة نفسها وكل فروعها (لمنع الحلقات في الشجرة)،
 * وتعرض المسار الكامل مثل «شاي أسود › شاي سيلاني».
 */
function buildParentChoices(options: CategoryOption[], excludeId?: string) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const excluded = new Set<string>();

  if (excludeId) {
    excluded.add(excludeId);
    let grew = true;
    while (grew) {
      grew = false;
      for (const o of options) {
        if (o.parentId && excluded.has(o.parentId) && !excluded.has(o.id)) {
          excluded.add(o.id);
          grew = true;
        }
      }
    }
  }

  const pathOf = (option: CategoryOption) => {
    const parts = [option.nameAr];
    let cursor = option.parentId;
    let guard = 0;
    while (cursor && guard++ < 20) {
      const parent = byId.get(cursor);
      if (!parent) break;
      parts.unshift(parent.nameAr);
      cursor = parent.parentId;
    }
    return parts.join(" › ");
  };

  return options
    .filter((o) => !excluded.has(o.id))
    .map((o) => ({ id: o.id, label: pathOf(o) }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

function isPreviewable(url: string) {
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
}

// ---------------------------------------------------------------------------
// المكوّن
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function CategoryForm({
  categoryId,
  initialValues,
  stats,
}: {
  categoryId?: string;
  initialValues?: Partial<CategoryFormValues>;
  stats?: { productsCount: number; childrenCount: number };
}) {
  const router = useRouter();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: options, isLoading: optionsLoading } = useAdminCategoryOptions();

  const initialRef = useRef<CategoryFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const initialPayload = useMemo(() => toPayload(initialRef.current), []);

  const [values, setValues] = useState<CategoryFormValues>(initialRef.current);
  const [slugTouched, setSlugTouched] = useState(!!categoryId); // لا نغيّر slug فئة قائمة تلقائياً
  const [error, setError] = useState<string | null>(null);
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  const savedRef = useRef(false);

  const submitting = createMutation.isPending || updateMutation.isPending;
  const dirty = !savedRef.current && JSON.stringify(values) !== JSON.stringify(initialRef.current);

  // تنبيه المتصفح عند مغادرة الصفحة وفيها تغييرات غير محفوظة
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const parentChoices = useMemo(
    () => buildParentChoices(options ?? [], categoryId),
    [options, categoryId],
  );

  function update<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onNameEnChange(value: string) {
    setValues((prev) => ({
      ...prev,
      nameEn: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = toPayload(values);

    try {
      if (categoryId) {
        const changes = buildChanges(payload, initialPayload);
        if (Object.keys(changes).length > 0) {
          await updateMutation.mutateAsync({ id: categoryId, payload: changes });
        }
      } else {
        await createMutation.mutateAsync(payload);
      }
      savedRef.current = true;
      router.push("/admin/categories");
    } catch (err) {
      setError(getErrorMessage(err, "حدث خطأ أثناء حفظ الفئة"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const imageUrl = values.image.trim();
  const showPreview = !!imageUrl && isPreviewable(imageUrl) && brokenImage !== imageUrl;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="grid content-start gap-6 lg:col-span-2">
          <Section title="المعلومات الأساسية">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم بالعربية">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={values.nameAr}
                  onChange={(e) => update("nameAr", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="الاسم بالإنجليزية">
                <input
                  required
                  dir="ltr"
                  minLength={2}
                  maxLength={100}
                  value={values.nameEn}
                  onChange={(e) => onNameEnChange(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="الرابط (Slug)"
              hint={
                categoryId
                  ? "تغيير الرابط يكسر الروابط القديمة للفئة في محركات البحث."
                  : "يُولَّد من الاسم الإنجليزي، ويمكنك تعديله."
              }
            >
              <input
                required
                dir="ltr"
                minLength={2}
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title="أحرف إنجليزية صغيرة وأرقام وشرطات فقط"
                placeholder="black-tea"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  update("slug", e.target.value);
                }}
                className={inputClass}
              />
            </Field>

            <Field label="الوصف (اختياري)" hint={`${values.description.length} / 500`}>
              <textarea
                rows={4}
                maxLength={500}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>
        </div>

        {/* العمود الجانبي */}
        <div className="grid content-start gap-6">
          <Section title="التنظيم">
            <Field label="الفئة الأب (اختياري)" hint="اتركها فارغة لتكون الفئة رئيسية.">
              <select
                value={values.parentId}
                onChange={(e) => update("parentId", e.target.value)}
                disabled={optionsLoading}
                className={inputClass}
              >
                <option value="">
                  {optionsLoading ? "جارٍ التحميل..." : "بدون فئة أب (فئة رئيسية)"}
                </option>
                {parentChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="الصورة">
            <Field label="رابط الصورة (اختياري)" hint="رابط https:// أو مسار محلي يبدأ بـ /">
              <input
                dir="ltr"
                maxLength={500}
                placeholder="https://..."
                value={values.image}
                onChange={(e) => update("image", e.target.value)}
                className={inputClass}
              />
            </Field>
            {showPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                onError={() => setBrokenImage(imageUrl)}
                className="aspect-video w-full rounded-md border border-stone-200 object-cover"
              />
            )}
            {!!imageUrl && !showPreview && (
              <p className="text-xs text-amber-700">تعذّر عرض معاينة الصورة، تحقق من الرابط.</p>
            )}
          </Section>

          {categoryId && stats && (
            <Section title="الاستخدام">
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-stone-500">المنتجات</dt>
                  <dd className="font-medium text-stone-800">
                    {stats.productsCount > 0 ? (
                      <Link
                        href={`/admin/products?category=${encodeURIComponent(initialRef.current.slug)}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {stats.productsCount}
                      </Link>
                    ) : (
                      0
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-stone-500">الفئات الفرعية</dt>
                  <dd className="font-medium text-stone-800">{stats.childrenCount}</dd>
                </div>
              </dl>
              {(stats.productsCount > 0 || stats.childrenCount > 0) && (
                <p className="text-xs text-stone-500">
                  لا يمكن حذف الفئة طالما تحتوي على منتجات أو فئات فرعية.
                </p>
              )}
            </Section>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 flex gap-3 border-t border-stone-200 bg-white/90 px-1 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-700 px-5 py-2 text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "جارٍ الحفظ..." : categoryId ? "حفظ التعديلات" : "إنشاء الفئة"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/categories")}
          disabled={submitting}
          className="rounded-md border border-stone-300 px-5 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// عناصر مساعدة
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-4 rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </label>
  );
}