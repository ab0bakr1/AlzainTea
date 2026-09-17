// src/lib/currency.ts
// منطق تحويل العملات وتنسيق الأسعار

// أسعار الصرف مقابل الدولار (تحديث يدوي — يمكن ربطه بـ API لاحقاً)
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  SAR: 3.75,
  OMR: 0.385,
  AED: 3.67,
  KWD: 0.307,
  BHD: 0.376,
  QAR: 3.64,
  GBP: 0.79,
  EUR: 0.92,
}

export type Currency = keyof typeof EXCHANGE_RATES

// ─── تحويل السعر ──────────────────────────────────────────────
export function convertPrice(amountUSD: number, toCurrency: string): number {
  const rate = EXCHANGE_RATES[toCurrency] ?? 1
  return amountUSD * rate
}

// ─── تنسيق السعر مع العملة ────────────────────────────────────
export function formatPrice(amount: number, currency: string, locale = 'ar-SA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── الحصول على رمز العملة ────────────────────────────────────
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    SAR: 'ر.س',
    OMR: 'ر.ع',
    AED: 'د.إ',
    KWD: 'د.ك',
    BHD: 'د.ب',
    QAR: 'ر.ق',
    GBP: '£',
    EUR: '€',
  }
  return symbols[currency] ?? currency
}

// ─── تحويل للوحدة الأصغر (للـ Stripe والبوابات المحلية) ───────
export function toSmallestUnit(amount: number, currency: string): number {
  // عملات بدون كسور عشرية
  const noDecimalCurrencies = ['KWD', 'BHD', 'OMR']
  if (noDecimalCurrencies.includes(currency)) {
    return Math.round(amount * 1000)
  }
  return Math.round(amount * 100)
}
