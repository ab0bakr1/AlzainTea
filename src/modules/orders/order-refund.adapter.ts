/**
 * ⚠️ الملف الوحيد في موديول الطلبات الذي يعتمد على واجهة payment.service.ts.
 * إذا اختلف اسم/توقيع دالة الاسترداد عندك، عدّل السطر الموسوم بـ (ADAPT) فقط.
 */
import { ApiError } from "@/lib/api-error";
import { refundPayment, type Gateway } from "@/modules/payments/payment.service"; // (ADAPT)
import { toSmallestUnit } from "@/lib/currency";
import { toMinorUnits } from "@/lib/gcc-currency";

export interface RefundableOrder {
  id: string;
  paymentMethod: string; // "stripe" | "tap" | "moyasar"
  paymentRef: string | null;
  currency: string;
  total: { toString(): string };
}

const VALID_GATEWAYS: readonly Gateway[] = ["stripe", "tap", "moyasar"];

function assertGateway(value: string): Gateway {
  if (!VALID_GATEWAYS.includes(value as Gateway)) {
    throw new ApiError("CONFIG_ERROR", `طريقة دفع غير معروفة للاسترداد: "${value}"`, 500);
  }
  return value as Gateway;
}

/** استرداد كامل لمبلغ الطلب عبر المزود الذي دفع به العميل */
export async function refundOrderPayment(order: RefundableOrder): Promise<void> {
  if (!order.paymentRef) {
    throw new ApiError("REFUND_NO_PAYMENT_REF", "لا يوجد مرجع دفع لهذا الطلب", 409);
  }

  const gateway = assertGateway(order.paymentMethod);
  const totalAmount = Number(order.total.toString());

  // (ADAPT) — refundPayment تتوقع 3 معاملات موضعية: (gateway, paymentRef, amountInMinorUnits)
  // والمبلغ يجب أن يكون بأصغر وحدة للعملة (سنت/هللة/فلس)، تماماً كما في checkout.service.ts
  // عند إنشاء جلسة الدفع — وليس بالوحدة الكبرى (decimal) كما هو مخزّن في Order.total.
  const amountInMinorUnits =
    gateway === "stripe"
      ? toSmallestUnit(totalAmount, "USD")
      : toMinorUnits(totalAmount, order.currency);

  await refundPayment(gateway, order.paymentRef, amountInMinorUnits);
}