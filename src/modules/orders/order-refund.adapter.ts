/**
 * ⚠️ الملف الوحيد في موديول الطلبات الذي يعتمد على واجهة payment.service.ts.
 * إذا اختلف اسم/توقيع دالة الاسترداد عندك، عدّل السطر الموسوم بـ (ADAPT) فقط.
 */
import { ApiError } from "@/lib/api-error";
import { refundPayment } from "@/modules/payments/payment.service"; // (ADAPT)

export interface RefundableOrder {
  id: string;
  paymentMethod: string; // "stripe" | "tap" | "moyasar"
  paymentRef: string | null;
  currency: string;
  total: { toString(): string };
}

/** استرداد كامل لمبلغ الطلب عبر المزود الذي دفع به العميل */
export async function refundOrderPayment(order: RefundableOrder): Promise<void> {
  if (!order.paymentRef) {
    throw new ApiError("REFUND_NO_PAYMENT_REF", "لا يوجد مرجع دفع لهذا الطلب", 409);
  }

  // (ADAPT) — مبلغ كامل بنفس عملة الطلب
  await refundPayment({
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    paymentRef: order.paymentRef,
    currency: order.currency,
    amount: Number(order.total.toString()),
  });
}