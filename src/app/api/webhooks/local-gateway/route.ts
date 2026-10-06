import { after, NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { getActiveLocalGateway } from "@/modules/payments/payment.service";
import { handlePaymentEvent, verifyWebhookOrReject } from "@/modules/payments/webhook.service";
import { sendOrderConfirmationEmail } from "@/modules/notifications/notification.service";

/**
 * نقطة استقبال موحّدة لأحداث البوابة الخليجية المحلية.
 * المزوّد الفعلي (Tap أو Moyasar) يُحدَّد عبر PAYMENT_PROVIDER في .env — نفس المتغير
 * المستخدم عند إنشاء جلسة الدفع (Feature Flag)، لذا فإن التبديل بين البوابتين لا يتطلب
 * أي تعديل في هذا الملف، فقط:
 *   1) تغيير PAYMENT_PROVIDER (و LOCAL_GATEWAY_API_KEY / LOCAL_GATEWAY_WEBHOOK_SECRET) في .env
 *   2) إعادة تسجيل هذا الرابط (/api/webhooks/local-gateway) في لوحة تحكم المزوّد الجديد
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const gateway = getActiveLocalGateway(); // قيمة PAYMENT_PROVIDER الخاطئة تُعاد 500 CONFIG_ERROR عبر fail()
    const gatewayLabel = gateway === "tap" ? "Tap" : "Moyasar";

    const event = verifyWebhookOrReject(gateway, rawBody, req.headers);
    const result = await handlePaymentEvent(gateway, gatewayLabel, event);

    const emailOrderId = result.confirmationEmailOrderId;
    if (emailOrderId) {
      after(() => sendOrderConfirmationEmail(emailOrderId));
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    return fail(error);
  }
}