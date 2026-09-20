/** تنسيق المبالغ والتواريخ للعرض. Intl يتعامل تلقائياً مع KWD/BHD/OMR (3 خانات عشرية). */
export function formatMoney(value: string | number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value));
  } catch {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}

export function formatDateTime(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}