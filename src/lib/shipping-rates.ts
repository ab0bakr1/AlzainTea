export type Gateway = "local" | "stripe";

export interface ShippingRate {
  country: string;
  cost: number; // بالدولار الأمريكي (USD)
  minDays: number;
  maxDays: number;
  currency: string;
  gateway: Gateway;
}

export const SHIPPING_RATES: Record<string, ShippingRate> = {
  SA: { country: "SA", cost: 5, minDays: 2, maxDays: 3, currency: "SAR", gateway: "local" },
  OM: { country: "OM", cost: 8, minDays: 3, maxDays: 5, currency: "OMR", gateway: "local" },
  AE: { country: "AE", cost: 5, minDays: 2, maxDays: 3, currency: "AED", gateway: "local" },
  KW: { country: "KW", cost: 7, minDays: 3, maxDays: 4, currency: "KWD", gateway: "local" },
  BH: { country: "BH", cost: 6, minDays: 3, maxDays: 4, currency: "BHD", gateway: "local" },
  QA: { country: "QA", cost: 7, minDays: 3, maxDays: 4, currency: "QAR", gateway: "local" },
  US: { country: "US", cost: 20, minDays: 7, maxDays: 14, currency: "USD", gateway: "stripe" },
  GB: { country: "GB", cost: 15, minDays: 7, maxDays: 10, currency: "GBP", gateway: "stripe" },
};

export const SUPPORTED_COUNTRIES = Object.keys(SHIPPING_RATES);

export function getShippingRate(country: string): ShippingRate | null {
  return SHIPPING_RATES[country.toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// إضافات للواجهة (useCountry / صفحة الدفع) — مبنية على SHIPPING_RATES أعلاه
// ولا تغيّر أي تصدير موجود.
// ---------------------------------------------------------------------------

/** أسماء الدول المعروضة في الواجهة. أضف هنا اسم أي دولة جديدة تضيفها إلى SHIPPING_RATES. */
const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {
  SA: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" },
  OM: { ar: "سلطنة عُمان", en: "Oman" },
  AE: { ar: "الإمارات العربية المتحدة", en: "United Arab Emirates" },
  KW: { ar: "الكويت", en: "Kuwait" },
  BH: { ar: "البحرين", en: "Bahrain" },
  QA: { ar: "قطر", en: "Qatar" },
  US: { ar: "الولايات المتحدة", en: "United States" },
  GB: { ar: "المملكة المتحدة", en: "United Kingdom" },
};

export interface ShippingCountry {
  code: string;
  nameAr: string;
  nameEn: string;
  /** عملة الدولة المحلية (للعرض فقط؛ الدفع الدولي عبر Stripe يتم بالدولار) */
  currency: string;
  /** تكلفة الشحن بالدولار الأمريكي (USD) */
  rate: number;
  estimatedDays: string;
  gateway: Gateway;
}

function toShippingCountry(r: ShippingRate): ShippingCountry {
  const names = COUNTRY_NAMES[r.country];
  return {
    code: r.country,
    nameAr: names?.ar ?? r.country,
    nameEn: names?.en ?? r.country,
    currency: r.currency,
    rate: r.cost,
    estimatedDays: `${r.minDays}-${r.maxDays} أيام عمل`,
    gateway: r.gateway,
  };
}

export const SHIPPING_COUNTRIES: ShippingCountry[] = Object.values(SHIPPING_RATES).map(toShippingCountry);

export function getCountryByCode(code: string): ShippingCountry | undefined {
  const rate = getShippingRate(code);
  return rate ? toShippingCountry(rate) : undefined;
}

/** البوابة المستخدمة للدولة: الخليج → local، وغيرها → stripe. */
export function getPaymentGateway(code: string): Gateway {
  return getShippingRate(code)?.gateway ?? "stripe";
}