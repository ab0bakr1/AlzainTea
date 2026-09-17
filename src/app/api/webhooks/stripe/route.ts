import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { findOrderByPaymentRef, markOrderPaid } from "@/modules/checkout/checkout.repository";

// هذا تكامل أولي (بداية تنفيذ الدفع عبر Stripe فقط).
// معالجة أحداث الفشل/الاسترداد وربط Webhook البوابة الخليجية المحلية (Tap/Moyasar)
// سيُستكملان الأسبوع القادم حسب خارطة الطريق.

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_SIGNATURE", message: "توقيع الحدث مفقود" } },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_SIGNATURE", message: "توقيع غير صالح", detail: (err as Error).message },
      },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; metadata?: { orderId?: string } };
    const orderId = session.metadata?.orderId;

    if (orderId) {
      // حماية من المعالجة المكررة (Idempotency) في حال أعاد Stripe إرسال نفس الحدث
      const existingOrder = await findOrderByPaymentRef(session.id);
      if (existingOrder && existingOrder.paymentStatus !== "PAID") {
        await markOrderPaid(orderId);
      }
    }
  }

  return NextResponse.json({ success: true, received: true });
}