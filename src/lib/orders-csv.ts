import type { OrderListItem } from "@/services/orders.service";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/modules/orders/order-status";

/**
 * خلية CSV آمنة:
 * - تهرب علامات الاقتباس والفواصل والأسطر.
 * - تمنع CSV/Formula Injection (قيم تبدأ بـ = + - @) عند الفتح في Excel.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildOrdersCsv(rows: OrderListItem[], lang: "ar" | "en"): string {
  const header = [
    "رقم الطلب",
    "التاريخ",
    "العميل",
    "البريد",
    "الدولة",
    "العملة",
    "الإجمالي",
    "طريقة الدفع",
    "حالة الدفع",
    "حالة الطلب",
    "عدد المنتجات",
  ];

  const lines = rows.map((o) =>
    [
      o.id,
      o.createdAt,
      o.user?.name ?? "زائر",
      o.user?.email ?? o.guestEmail ?? "",
      o.country,
      o.currency,
      o.total,
      o.paymentMethod,
      PAYMENT_STATUS_LABELS[o.paymentStatus][lang],
      ORDER_STATUS_LABELS[o.status][lang],
      o._count.items,
    ]
      .map(csvCell)
      .join(",")
  );

  // BOM ليفتح Excel النص العربي بترميز UTF-8 صحيح
  return "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}