import { NextRequest, NextResponse } from "next/server";
import { getActiveLocalGateway, verifyProviderWebhook } from "@/modules/payments/payment.service";
import { findOrderByPaymentRef, markOrderPaid, releaseReservedStock } from "@/modules/checkout/checkout.repository";
import { after } from "next/server";
import { sendOrderConfirmationEmail } from "@/modules/notifications/notification.service";

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

    if (!existingOrder) {
      // لا يجوز الصمت هنا: دفعة ناجحة بلا طلب مطابق تعني خللاً حقيقياً
      // (سباق تزامن، عدم تطابق paymentRef، أو محاولة تلاعب). نُسجّل الخطأ
      // ونرجع 200 لمنع إعادة إرسال العميل نفس الحدث بلا نهاية، لكن مع تنبيه صريح في اللوج
      // للمراجعة اليدوية الفورية بدل ضياع الدفعة بصمت.
      console.error(
        `[LOCAL_GATEWAY_WEBHOOK] PAID event received but no matching order found`,
        { gateway: gatewayLabel, orderId: event.orderId, providerRef: event.providerRef }
      );
      // TODO: إرسال تنبيه فوري (Sentry/Slack) لهذه الحالة تحديداً — دفعة بلا طلب مطابق
    } else if (existingOrder.paymentStatus !== "PAID") {
      const orderId = existingOrder.id;
      await markOrderPaid(orderId, gatewayLabel);
      after(() => sendOrderConfirmationEmail(orderId));
    }
    // else: الطلب مدفوع مسبقاً فعلاً — تكرار الحدث، لا حاجة لأي إجراء (Idempotency)
  } else if (event.type === "FAILED" && event.orderId) {
    await releaseReservedStock(event.orderId, `فشلت عملية الدفع عبر ${gatewayLabel}`);
  }

  return NextResponse.json({ success: true, received: true });
}