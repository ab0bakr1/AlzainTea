/**
 * آلة حالات الطلب (Order State Machine) — دوال نقية بدون أي اعتماد على Prisma أو HTTP
 * يمكن استيرادها من الخادم ومن مكونات الواجهة على حد سواء.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "FAILED",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "FAILED", "REFUNDED", "PENDING"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

/** الانتقالات المسموحة. الحالات النهائية: CANCELLED / REFUNDED / FAILED */
export const ORDER_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  RETURNED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: [],
};

/**
 * الحالات التي يستطيع المدير تعيينها يدوياً.
 * PENDING / CONFIRMED / FAILED تتحكم بها بوابات الدفع (Webhooks) فقط.
 */
export const ADMIN_SETTABLE_STATUSES = [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const satisfies readonly OrderStatusValue[];

/** الحالات التي يستطيع العميل إلغاء الطلب منها */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatusValue[] = ["PENDING", "CONFIRMED"];

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

/** الحالات التالية المتاحة للمدير من حالة معينة */
export function allowedNextStatusesForAdmin(from: OrderStatusValue): OrderStatusValue[] {
  return ORDER_TRANSITIONS[from].filter((s) =>
    (ADMIN_SETTABLE_STATUSES as readonly string[]).includes(s)
  );
}

// ---------------------------------------------------------------------------
// خطة الانتقال: ماذا يحدث للمخزون والمال عند كل انتقال؟
// ---------------------------------------------------------------------------

/**
 * NONE             → لا تغيير على المخزون
 * RELEASE_RESERVED → طلب غير مدفوع: تحرير reservedStock (والمتغيرات: إعادة stock)
 * RESTOCK          → طلب مدفوع: إعادة الكمية إلى stock الفعلي
 */
export type StockEffect = "NONE" | "RELEASE_RESERVED" | "RESTOCK";

export interface TransitionPlan {
  stock: StockEffect;
  /** هل يجب استرداد المبلغ من بوابة الدفع؟ */
  refund: boolean;
  /** حالة الدفع الجديدة إن تغيرت */
  paymentStatus?: PaymentStatusValue;
}

export type PlanResult =
  | { ok: true; plan: TransitionPlan }
  | { ok: false; code: string; message: string };

export function planTransition(
  order: { status: OrderStatusValue; paymentStatus: PaymentStatusValue },
  to: OrderStatusValue,
  opts: { restock?: boolean } = {}
): PlanResult {
  if (!canTransition(order.status, to)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `لا يمكن نقل الطلب من ${order.status} إلى ${to}`,
    };
  }

  const paid = order.paymentStatus === "PAID";

  switch (to) {
    case "CANCELLED": {
      if (order.paymentStatus === "PENDING") {
        return {
          ok: false,
          code: "PAYMENT_IN_PROGRESS",
          message: "عملية الدفع قيد المعالجة، حاول مرة أخرى بعد قليل",
        };
      }
      return paid
        ? { ok: true, plan: { stock: "RESTOCK", refund: true, paymentStatus: "REFUNDED" } }
        : { ok: true, plan: { stock: "RELEASE_RESERVED", refund: false } };
    }
    case "FAILED":
      return {
        ok: true,
        plan: { stock: "RELEASE_RESERVED", refund: false, paymentStatus: "FAILED" },
      };
    case "RETURNED":
      return { ok: true, plan: { stock: opts.restock ? "RESTOCK" : "NONE", refund: false } };
    case "REFUNDED":
      if (!paid) {
        return {
          ok: false,
          code: "NOT_REFUNDABLE",
          message: "لا يمكن استرداد طلب غير مدفوع",
        };
      }
      return { ok: true, plan: { stock: "NONE", refund: true, paymentStatus: "REFUNDED" } };
    default:
      return { ok: true, plan: { stock: "NONE", refund: false } };
  }
}

// ---------------------------------------------------------------------------
// تسميات العرض
// ---------------------------------------------------------------------------

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, { ar: string; en: string }> = {
  PENDING: { ar: "بانتظار الدفع", en: "Pending payment" },
  CONFIRMED: { ar: "مؤكد", en: "Confirmed" },
  PROCESSING: { ar: "قيد التجهيز", en: "Processing" },
  SHIPPED: { ar: "تم الشحن", en: "Shipped" },
  DELIVERED: { ar: "تم التوصيل", en: "Delivered" },
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
  RETURNED: { ar: "مرتجع", en: "Returned" },
  REFUNDED: { ar: "تم الاسترداد", en: "Refunded" },
  FAILED: { ar: "فشل الدفع", en: "Payment failed" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, { ar: string; en: string }> = {
  UNPAID: { ar: "غير مدفوع", en: "Unpaid" },
  PAID: { ar: "مدفوع", en: "Paid" },
  FAILED: { ar: "فشل", en: "Failed" },
  REFUNDED: { ar: "مسترد", en: "Refunded" },
  PENDING: { ar: "قيد المعالجة", en: "Processing" },
};