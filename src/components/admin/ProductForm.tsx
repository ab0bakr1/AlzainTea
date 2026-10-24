"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCategoryOptions,
  useCreateProduct,
  useUpdateProduct,
} from "@/hooks/useAdminProducts";
import {
  extractApiError,
  type AdminProductDetail,
  type ProductPayload,
  type ProductStatus,
} from "@/services/products.service";
import { ProductImagesField } from "./ProductImagesField";
import { ProductVariantsField, type VariantRow } from "./ProductVariantsField";

// ---------------------------------------------------------------------------
// حالة النموذج (نصوص للحقول) والتحويل من/إلى الـ payload
// ---------------------------------------------------------------------------

interface FormValues {
  nameAr: string;
  nameEn: string;
  slug: string;
  descAr: string;
  descEn: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  status: ProductStatus;
  categoryId: string;
  images: string[];
  variants: VariantRow[];
}

const EMPTY_VALUES: FormValues = {
  nameAr: "",
  nameEn: "",
  slug: "",
  descAr: "",
  descEn: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  sku: "",
  status: "DRAFT",
  categoryId: "",
  images: [],
  variants: [],
};

function toFormValues(p?: AdminProductDetail): FormValues {
  if (!p) return EMPTY_VALUES;
  return {
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    slug: p.slug,
    descAr: p.descAr,
    descEn: p.descEn,
    price: String(p.price),
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
    stock: String(p.stock),
    sku: p.sku,
    status: p.status,
    categoryId: p.categoryId,
    images: [...p.images],
    variants: p.variants.map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price != null ? String(v.price) : "",
      stock: String(v.stock),
    })),
  };
}

function toPayload(v: FormValues): ProductPayload {
  return {
    nameAr: v.nameAr.trim(),
    nameEn: v.nameEn.trim(),
    slug: v.slug.trim().toLowerCase(),
    descAr: v.descAr.trim(),
    descEn: v.descEn.trim(),
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice.trim() ? Number(v.compareAtPrice) : null,
    stock: Number(v.stock || 0),
    sku: v.sku.trim(),
    images: Array.from(new Set(v.images.map((u) => u.trim()).filter(Boolean))),
    status: v.status,
    categoryId: v.categoryId,
    variants: v.variants.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      sku: row.sku.trim(),
      price: row.price.trim() ? Number(row.price) : null,
      stock: Number(row.stock || 0),
    })),
  };
}

/**
 * التعديل يرسل الحقول المتغيّرة فقط. هذا يمنع الكتابة فوق مخزون تغيّر أثناء فتح الصفحة
 * (مثلاً بسبب تأكيد دفع طلب جديد) إلا إذا عدّل المدير المخزون فعلاً.
 */
function buildChanges(current: ProductPayload, initial: ProductPayload): Partial<ProductPayload> {
  const changes: Partial<ProductPayload> = {};

  (Object.keys(current) as (keyof ProductPayload)[]).forEach((key) => {
    if (key === "variants") return;
    if (JSON.stringify(current[key]) !== JSON.stringify(initial[key])) {
      Object.assign(changes, { [key]: current[key] });
    }
  });

  if (JSON.stringify(current.variants) !== JSON.stringify(initial.variants)) {
    // الخادم يزامن القائمة كاملة (ما غاب عنها يُحذف)، لذا نرسلها كاملة
    // لكن نُسقط stock من المتغيرات القائمة التي لم يتغيّر مخزونها
    changes.variants = current.variants.map((variant) => {
      const before = variant.id ? initial.variants.find((i) => i.id === variant.id) : undefined;
      if (before && before.stock === variant.stock) {
        const { stock: _unchanged, ...rest } = variant;
        void _unchanged;
        return rest;
      }
      return variant;
    });
  }

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

// ---------------------------------------------------------------------------
// المكوّن
// ---------------------------------------------------------------------------

const inputClass = "adm-control w-full";

const STATUS_VALUES: ProductStatus[] = ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"];

export function ProductForm({ product }: { product?: AdminProductDetail }) {
  const t = useTranslations("adminPanel.productForm");
  const router = useRouter();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categories, isLoading: categoriesLoading } = useCategoryOptions();

  const initialValues = useMemo(() => toFormValues(product), [product]);
  const initialPayload = useMemo(() => toPayload(initialValues), [initialValues]);

  const [values, setValues] = useState<FormValues>(initialValues);
  const [slugTouched, setSlugTouched] = useState(!!product); // لا نغيّر slug منتج قائم تلقائياً
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submitting = createMutation.isPending || updateMutation.isPending;
  const dirty = !saved && JSON.stringify(values) !== JSON.stringify(initialValues);

  // تنبيه المتصفح عند مغادرة الصفحة وفيها تغييرات غير محفوظة
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
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
      if (product) {
        const changes = buildChanges(payload, initialPayload);
        if (Object.keys(changes).length > 0) {
          await updateMutation.mutateAsync({ id: product.id, payload: changes });
        }
      } else {
        await createMutation.mutateAsync(payload);
      }
      setSaved(true);
      router.push("/admin/products");
    } catch (err) {
      setError(extractApiError(err, t("saveError")));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const reserved = product?.reservedStock ?? 0;
  const stockNumber = Number(values.stock || 0);

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
                  maxLength={150}
                  value={values.nameAr}
                  onChange={(e) => update("nameAr", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("fields.nameEn")}>
                <input
                  required
                  dir="ltr"
                  maxLength={150}
                  value={values.nameEn}
                  onChange={(e) => onNameEnChange(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label={t("fields.slug")}
              hint={product ? t("hints.slugEdit") : t("hints.slugNew")}
            >
              <input
                required
                dir="ltr"
                maxLength={120}
                placeholder="ceylon-black-tea"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  update("slug", e.target.value);
                }}
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.descAr")}>
                <textarea
                  required
                  rows={5}
                  maxLength={5000}
                  value={values.descAr}
                  onChange={(e) => update("descAr", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("fields.descEn")}>
                <textarea
                  required
                  dir="ltr"
                  rows={5}
                  maxLength={5000}
                  value={values.descEn}
                  onChange={(e) => update("descEn", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section title={t("sections.images")}>
            <ProductImagesField value={values.images} onChange={(v) => update("images", v)} />
          </Section>

          <Section title={t("sections.variants")}>
            <ProductVariantsField value={values.variants} onChange={(v) => update("variants", v)} />
          </Section>
        </div>

        {/* العمود الجانبي */}
        <div className="grid content-start gap-6">
          <Section title={t("sections.publish")}>
            <Field label={t("fields.status")}>
              <select
                value={values.status}
                onChange={(e) => update("status", e.target.value as ProductStatus)}
                className={inputClass}
              >
                {STATUS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`statusOptions.${v}.label`)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="adm-subtle text-xs">{t(`statusOptions.${values.status}.hint`)}</p>
          </Section>

          <Section title={t("sections.organize")}>
            <Field label={t("fields.category")}>
              <select
                required
                value={values.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                disabled={categoriesLoading}
                className={inputClass}
              >
                <option value="">{categoriesLoading ? t("loading") : t("chooseCategory")}</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} / {c.nameEn}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("fields.sku")}>
              <input
                required
                dir="ltr"
                maxLength={64}
                value={values.sku}
                onChange={(e) => update("sku", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title={t("sections.pricing")}>
            <Field label={t("fields.price")}>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={values.price}
                onChange={(e) => update("price", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.compareAt")} hint={t("hints.compareAt")}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={values.compareAtPrice}
                onChange={(e) => update("compareAtPrice", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label={t("fields.stock")}
              hint={
                product
                  ? t("hints.stock", { reserved, available: Math.max(0, stockNumber - reserved) })
                  : undefined
              }
            >
              <input
                required
                type="number"
                step="1"
                min={reserved}
                value={values.stock}
                onChange={(e) => update("stock", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>
        </div>
      </div>

      <div className="adm-sticky-bar">
        <button
          type="submit"
          disabled={submitting}
          className="ds-btn ds-btn-primary px-8"
        >
          {submitting ? t("actions.saving") : product ? t("actions.saveChanges") : t("actions.create")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          disabled={submitting}
          className="ds-btn ds-btn-outline px-8"
        >
          {t("actions.cancel")}
        </button>
        {dirty && <span className="self-center text-xs text-[var(--color-warning)]">{t("actions.unsaved")}</span>}
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