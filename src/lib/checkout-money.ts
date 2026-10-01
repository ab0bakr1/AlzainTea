// src/lib/checkout-money.ts
// عرض المبالغ في صفحة الدفع بنفس منطق الخادم:
// المنتجات بالدولار، وتُحوَّل كل بنود الطلب إلى عملة البوابة (الخليج → عملة الدولة، غيرها → USD)
// ثم تُجمع، لتفادي فروقات التقريب. العرض تقديري، والمبلغ النهائي يحسبه الخادم.

import { convertUsdToLocal, currencyForCountry, roundForCurrency } from "@/lib/gcc-currency";
import { formatMoney } from "@/lib/order-format";

export function makeMoney(countryCode: string, locale = "ar") {
  const currency = currencyForCountry(countryCode) ?? "USD";

  const toCharge = (usd: number) =>
    currency === "USD" ? roundForCurrency(usd, "USD") : convertUsdToLocal(usd, currency);

  return {
    currency,
    toCharge,
    round: (amount: number) => roundForCurrency(amount, currency),
    format: (amount: number) => formatMoney(amount, currency, locale),
  };
}

export type CheckoutMoney = ReturnType<typeof makeMoney>;