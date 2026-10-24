"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
function buildParentChoices(options: CategoryOption[], excludeId?: string, lang: "ar" | "en" = "ar") {
  const nameOf = (o: { nameAr: string; nameEn?: string | null }) => (lang === "ar" ? o.nameAr : (o.nameEn ?? o.nameAr));
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
    const parts = [nameOf(option)];
    let cursor = option.parentId;
    let guard = 0;
    while (cursor && guard++ < 20) {
      const parent = byId.get(cursor);
      if (!parent) break;
      parts.unshift(nameOf(parent));
      cursor = parent.parentId;
    }
    return parts.join(" › ");
  };

  return options
    .filter((o) => !excluded.has(o.id))
    .map((o) => ({ id: o.id, label: pathOf(o) }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

function isPreviewable(url: string) {
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
}

// ---------------------------------------------------------------------------
// المكوّن
// ---------------------------------------------------------------------------

const inputClass = "adm-control w-full";

export function CategoryForm({
  categoryId,
  initialValues,
  stats,
}: {
  categoryId?: string;
  initialValues?: Partial<CategoryFormValues>;
  stats?: { productsCount: number; childrenCount: number };
}) {
  const t = useTranslations("adminPanel.categoryForm");
  const lang = useLocale() === "ar" ? "ar" : "en";
  const router = useRouter();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: options, isLoading: optionsLoading } = useAdminCategoryOptions();

  const [initial] = useState<CategoryFormValues>(() => ({ ...EMPTY_VALUES, ...initialValues }));
  const initialPayload = useMemo(() => toPayload(initial), [initial]);

  const [values, setValues] = useState<CategoryFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(!!categoryId); // لا نغيّر slug فئة قائمة تلقائياً
  const [error, setError] = useState<string | null>(null);
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submitting = createMutation.isPending || updateMutation.isPending;
  const dirty = !saved && JSON.stringify(values) !== JSON.stringify(initial);

  // تنبيه المتصفح عند مغادرة الصفحة وفيها تغييرات غير محفوظة
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const parentChoices = useMemo(
    () => buildParentChoices(options ?? [], categoryId, lang),
    [options, categoryId, lang],
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
      setSaved(true);
      router.push("/admin/categories");
    } catch (err) {
      setError(getErrorMessage(err, t("saveError")));
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
          className="adm-alert adm-alert-error"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="grid content-start gap-6 lg:col-span-2">
          <Section title={t("sections.basic")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.nameAr")}>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={values.nameAr}
                  onChange={(e) => update("nameAr", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("fields.nameEn")}>
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
              label={t("fields.slug")}
              hint={categoryId ? t("hints.slugEdit") : t("hints.slugNew")}
            >
              <input
                required
                dir="ltr"
                minLength={2}
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title={t("slugPatternTitle")}
                placeholder="black-tea"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  update("slug", e.target.value);
                }}
                className={inputClass}
              />
            </Field>

            <Field label={t("fields.description")} hint={`${values.description.length} / 500`}>
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
          <Section title={t("sections.organize")}>
            <Field label={t("fields.parent")} hint={t("hints.parent")}>
              <select
                value={values.parentId}
                onChange={(e) => update("parentId", e.target.value)}
                disabled={optionsLoading}
                className={inputClass}
              >
                <option value="">
                  {optionsLoading ? t("loading") : t("noParent")}
                </option>
                {parentChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title={t("sections.image")}>
            <Field label={t("fields.imageUrl")} hint={t("hints.imageUrl")}>
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
                className="aspect-video w-full rounded-[var(--radius-xl)] border border-[var(--border-color)] object-cover"
              />
            )}
            {!!imageUrl && !showPreview && (
              <p className="text-xs text-[var(--color-warning)]">{t("previewFailed")}</p>
            )}
          </Section>

          {categoryId && stats && (
            <Section title={t("sections.usage")}>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="adm-subtle">{t("usage.products")}</dt>
                  <dd className="font-semibold">
                    {stats.productsCount > 0 ? (
                      <Link
                        href={`/admin/products?category=${encodeURIComponent(initial.slug)}`}
                        className="adm-link"
                      >
                        {stats.productsCount}
                      </Link>
                    ) : (
                      0
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="adm-subtle">{t("usage.children")}</dt>
                  <dd className="font-semibold">{stats.childrenCount}</dd>
                </div>
              </dl>
              {(stats.productsCount > 0 || stats.childrenCount > 0) && (
                <p className="adm-subtle text-xs">{t("usage.blockedNote")}</p>
              )}
            </Section>
          )}
        </div>
      </div>

      <div className="adm-sticky-bar">
        <button
          type="submit"
          disabled={submitting}
          className="ds-btn ds-btn-primary px-8"
        >
          {submitting ? t("actions.saving") : categoryId ? t("actions.saveChanges") : t("actions.create")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/categories")}
          disabled={submitting}
          className="ds-btn ds-btn-outline px-8"
        >
          {t("actions.cancel")}
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
    <section className="adm-card grid content-start gap-4 p-6">
      <h2 className="ds-font-heading text-lg font-bold">{title}</h2>
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
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="adm-subtle text-xs">{hint}</span>}
    </label>
  );
}