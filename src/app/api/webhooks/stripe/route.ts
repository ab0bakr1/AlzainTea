import { after, NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { handlePaymentEvent, verifyWebhookOrReject } from "@/modules/payments/webhook.service";
import { sendOrderConfirmationEmail } from "@/modules/notifications/notification.service";

/**
 * نقطة استقبال أحداث Stripe. المنطق كله في webhook.service (مشترك مع البوابة المحلية).
 * أحداث Stripe المطلوب تسجيلها في اللوحة: checkout.session.completed و checkout.session.expired
 * (ويُفضَّل charge.refunded لرصد الاستردادات التي تبدأ من لوحة Stripe).
 * أي خطأ غير متوقع يُعاد 500 عبر fail() فيعيد Stripe المحاولة تلقائياً.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // الجسم الخام ضروري لحساب التوقيع
    const event = verifyWebhookOrReject("stripe", rawBody, req.headers);
    const result = await handlePaymentEvent("stripe", "Stripe", event);

    const emailOrderId = result.confirmationEmailOrderId;
    if (emailOrderId) {
      // يُنفَّذ بعد إرجاع الرد؛ لا يرمي أخطاء ولا يتكرر (حجز ذري في notification.service)
      after(() => sendOrderConfirmationEmail(emailOrderId));
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    return fail(error);
  }
}