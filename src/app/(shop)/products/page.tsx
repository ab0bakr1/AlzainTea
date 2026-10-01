import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsCatalog, {
  CatalogSkeleton,
} from "@/components/shop/ProductsCatalog";

type SearchParams = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "q",
  "category",
  "brand",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
  "page",
];

/**
 * صفحة /products الأساسية فقط هي التي تُفهرس.
 * أي رابط يحتوي فلتر/بحث/ترتيب/ترقيم يُعلَّم noindex ويشير canonical إلى /products
 * (منسجم مع robots.ts الذي يحجب روابط الفلاتر) لتفادي المحتوى المكرر.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const isFiltered = FILTER_KEYS.some((key) => sp[key] !== undefined);

  return {
    title: "المنتجات | Products — متجر الزين للشاي",
    description:
      "تسوّق أجود أنواع الشاي الفاخر وملحقاته مع شحن إلى دول الخليج والعالم. Shop premium teas and accessories with delivery across the GCC and worldwide.",
    alternates: { canonical: "/products" },
    robots: isFiltered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "المنتجات — متجر الزين للشاي",
      type: "website",
      url: "/products",
    },
  };
}

export default function ProductsPage() {
  // useSearchParams داخل المكوّن العميل يتطلب Suspense boundary
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ProductsCatalog />
    </Suspense>
  );
}