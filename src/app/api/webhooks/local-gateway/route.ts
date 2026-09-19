import { NextRequest, NextResponse } from "next/server";
import { getActiveLocalGateway, verifyProviderWebhook } from "@/modules/payments/payment.service";
import { findOrderByPaymentRef, markOrderPaid, releaseReservedStock } from "@/modules/checkout/checkout.repository";

/**
 * نقطة استقبال موحّدة لأحداث البوابة الخليجية المحلية.
 * المزوّد الفعلي (Tap أو Moyasar) يُحدَّد عبر PAYMENT_PROVIDER في .env — نفس المتغير
 * المستخدم عند إنشاء جلسة الدفع في checkout.service.ts (Feature Flag)، لذا فإن
 * التبديل بين البوابتين لا يتطلب أي تعديل في هذا الملف، فقط:
 *   1) تغيير PAYMENT_PROVIDER في .env
 *   2) إعادة تسجيل هذا الرابط (/api/webhooks/local-gateway) في لوحة تحكم المزوّد الجديد
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const gateway = getActiveLocalGateway();

  let event;
  try {
    event = verifyProviderWebhook(gateway, rawBody, req.headers);
  } catch (err) {
    console.error(`Local gateway (${gateway}) webhook verification failed`, err);
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SIGNATURE", message: "تعذر التحقق من الحدث الوارد" } },
      { status: 400 }
    );
  }

  const gatewayLabel = gateway === "tap" ? "Tap" : "Moyasar";

  if (event.type === "PAID" && event.orderId) {
    // حماية من المعالجة المكررة (Idempotency) في حال أعاد المزوّد إرسال نفس الحدث
    const existingOrder = await findOrderByPaymentRef(event.providerRef);
    if (existingOrder && existingOrder.paymentStatus !== "PAID") {
      await markOrderPaid(event.orderId, gatewayLabel);
    }
  } else if (event.type === "FAILED" && event.orderId) {
    await releaseReservedStock(event.orderId, `فشلت عملية الدفع عبر ${gatewayLabel}`);
  }

  return NextResponse.json({ success: true, received: true });
}