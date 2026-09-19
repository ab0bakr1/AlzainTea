import { NextRequest, NextResponse } from "next/server";
import { verifyProviderWebhook } from "@/modules/payments/payment.service";
import { findOrderByPaymentRef, markOrderPaid, releaseReservedStock } from "@/modules/checkout/checkout.repository";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let event;
  try {
    event = verifyProviderWebhook("stripe", rawBody, req.headers);
  } catch (err) {
    console.error("Stripe webhook verification failed", err);
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SIGNATURE", message: (err as Error).message } },
      { status: 400 }
    );
  }

  if (event.type === "PAID" && event.orderId) {
    // حماية من المعالجة المكررة (Idempotency) في حال أعاد Stripe إرسال نفس الحدث
    const existingOrder = await findOrderByPaymentRef(event.providerRef);
    if (existingOrder && existingOrder.paymentStatus !== "PAID") {
      await markOrderPaid(event.orderId, "Stripe");
    }
  } else if (event.type === "FAILED" && event.orderId) {
    // انتهت صلاحية جلسة الدفع دون إتمامها — نُحرر المخزون المحجوز فوراً بدل انتظار مهلة زمنية
    await releaseReservedStock(event.orderId, "فشلت أو انتهت صلاحية جلسة الدفع عبر Stripe");
  }
  // أحداث REFUNDED تُدار حالياً عبر مسار إدارة الطلبات اليدوي (provider.refund + markOrderRefunded)؛
  // يمكن ربطها هنا مستقبلاً إن احتجت تحديث الحالة تلقائياً عند استرداد يبدأ من لوحة Stripe مباشرة.

  return NextResponse.json({ success: true, received: true });
}