import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import MyOrdersList from "@/components/shop/MyOrdersList";

export async function generateMetadata() {
  const t = await getTranslations("orders.list");
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountOrdersPage() {
  const t = await getTranslations("orders.list");

  return (
    <>
      {/* شريط عنوان داكن بنفس روح الـ Hero في الصفحة الرئيسية */}
      <header className="relative overflow-hidden bg-[linear-gradient(160deg,#1a1612_0%,#0f0d0a_60%,#14110c_100%)] text-[#f0e6d3]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(201,164,92,0.14),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
          <h1 className="ds-font-heading text-3xl font-extrabold text-[#f0e6d3] md:text-5xl">
            {t("pageTitle")}
          </h1>
          <span aria-hidden className="mt-4 block h-[2px] w-12 rounded-full bg-[var(--brand-gold)]" />
          <p className="mt-5 max-w-prose text-base leading-8 text-[#c4b49e] md:text-lg">
            {t("pageSubtitle")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
        <div aria-hidden className="ds-dune-divider mb-8 opacity-40" />
        {/* MyOrdersList يقرأ فلاتر الرابط عبر useSearchParams فيحتاج Suspense عند البناء */}
        <Suspense fallback={<p className="ds-text-secondary">…</p>}>
          <MyOrdersList />
        </Suspense>
      </div>
    </>
  );
}