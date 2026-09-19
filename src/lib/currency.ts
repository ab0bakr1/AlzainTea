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

// عملات بدون كسور عشرية شائعة (تُخزَّن أصغر وحدتها من 3 خانات عشرية بدل 2)
const NO_DECIMAL_CURRENCIES = ['KWD', 'BHD', 'OMR']

// ─── تحويل للوحدة الأصغر (لـ Stripe و Moyasar) ─────────────────
export function toSmallestUnit(amount: number, currency: string): number {
  if (NO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return Math.round(amount * 1000)
  }
  return Math.round(amount * 100)
}

// ─── العكس: من الوحدة الأصغر إلى رقم عشري (Tap يطلب المبلغ كرقم عشري) ───
export function fromSmallestUnit(amount: number, currency: string): number {
  if (NO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return amount / 1000
  }
  return amount / 100
}