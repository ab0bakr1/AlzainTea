// src/lib/gcc-currency.ts
//
// تحويل مبسّط من الدولار الأمريكي (عملة تسعير المنتجات الأساسية في Product.price)
// إلى عملات دول الخليج، لاستخدامه فقط عند التوجيه إلى بوابة الدفع المحلية (Tap/Moyasar).
//
// ⚠️ ملاحظة مهمة (MVP فقط — راجع بند "V2" في خطة البناء):
// الأسعار أدناه أسعار ربط تقريبية ثابتة في الكود، وليست أسعار صرف حية.
// أخطرها الدينار الكويتي (KWD): لا يتبع ربطاً رسمياً ثابتاً بالدولار كبقية عملات
// الخليج، بل يتحدد بسلة عملات ويتحرك فعلياً — يجب استبداله بمزوّد أسعار صرف حي
// (مثل exchangerate.host) قبل قبول أي عملية دفع حقيقية بالدينار الكويتي.
// بقية العملات (SAR, AED, OMR, BHD, QAR) مرتبطة رسمياً بالدولار وأكثر أماناً مؤقتاً.

export const GCC_CURRENCY_BY_COUNTRY: Record<string, string> = {
  SA: "SAR",
  AE: "AED",
  OM: "OMR",
  KW: "KWD",
  BH: "BHD",
  QA: "QAR",
};

// سعر الصرف التقريبي: كم وحدة من العملة المحلية يساوي 1 دولار أمريكي
const APPROX_USD_TO_LOCAL_RATE: Record<string, number> = {
  SAR: 3.75,
  AED: 3.6725,
  OMR: 0.385,
  KWD: 0.307, // ⚠️ تقريبي فقط، غير مرتبط رسمياً — راجع الملاحظة أعلاه
  BHD: 0.376,
  QAR: 3.64,
};

// العملات ثلاثية الخانات العشرية (الدينار الكويتي، البحريني، والريال العُماني)
const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);

export function decimalPlacesFor(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
}

/** يرجع رمز عملة دولة خليجية، أو undefined إن لم تكن الدولة ضمن دول الخليج المدعومة */
export function currencyForCountry(country: string): string | undefined {
  return GCC_CURRENCY_BY_COUNTRY[country.toUpperCase()];
}

/** يقرّب مبلغاً لعدد الخانات العشرية الصحيح لعملته (2 عادة، 3 لـ KWD/BHD/OMR) */
export function roundForCurrency(amount: number, currency: string): number {
  const factor = 10 ** decimalPlacesFor(currency);
  return Math.round(amount * factor) / factor;
}

/** يحوّل مبلغاً بالدولار إلى العملة المحلية المطلوبة، مع تقريب صحيح لعدد خاناتها العشرية */
export function convertUsdToLocal(amountUsd: number, currency: string): number {
  const rate = APPROX_USD_TO_LOCAL_RATE[currency.toUpperCase()];
  if (!rate) {
    throw new Error(`لا يوجد سعر صرف تقريبي معرّف للعملة ${currency}`);
  }
  return roundForCurrency(amountUsd * rate, currency);
}

/** يحوّل مبلغاً بوحدة العملة الكاملة إلى أصغر وحدة (هللة/فلس) حسب عدد خاناتها العشرية */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** decimalPlacesFor(currency));
}