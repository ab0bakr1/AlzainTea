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