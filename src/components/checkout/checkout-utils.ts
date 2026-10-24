// src/components/checkout/checkout-utils.ts
// اسم الدولة حسب لغة الواجهة. إن لم يتوفر الاسم الإنجليزي في shipping-rates نرجع للعربي ثم للرمز.

import { getCountryByCode } from "@/lib/shipping-rates";

type CountryNames = { nameAr?: string; nameEn?: string };

export function countryLabel(code: string, locale: string): string {
  const c = getCountryByCode(code) as unknown as CountryNames | undefined | null;
  if (!c) return code;
  return (locale === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr)) ?? code;
}