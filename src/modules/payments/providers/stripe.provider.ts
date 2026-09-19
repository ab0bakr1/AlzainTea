import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ApiError } from "@/lib/api-error";
import { setOrderPaymentRef } from "@/modules/checkout/checkout.repository";
import {
  CreateSessionParams,
  CreateSessionResult,
  PaymentProvider,
  WebhookEvent,
} from "@/modules/payments/payment.types";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function createStripeCheckoutSession(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: { name: `طلب متجر الزين للشاي #${params.orderId}` },
          unit_amount: params.amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: params.orderId },
    success_url: `${APP_URL}/checkout/success?orderId=${params.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/checkout/cancel?orderId=${params.orderId}`,
  });

  if (!session.url) {
    throw new ApiError("PAYMENT_ERROR", "تعذر إنشاء جلسة الدفع عبر Stripe", 502);
  }

  await setOrderPaymentRef(params.orderId, session.id);

  return { url: session.url, providerRef: session.id };
}

/**
 * يتحقق من توقيع Stripe عبر ترويسة stripe-signature ويحوّل الحدث لصيغة WebhookEvent موحدة.
 * يرمي ApiError(400) عند توقيع مفقود أو غير صالح — لا يُعالج أي حدث دون تحقق ناجح.
 */
function verifyStripeWebhook(rawBody: string, headers: Headers): WebhookEvent {
  const signature = headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    throw new ApiError("MISSING_SIGNATURE", "توقيع Stripe مفقود أو الإعداد ناقص", 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw new ApiError("INVALID_SIGNATURE", `توقيع Stripe غير صالح: ${(err as Error).message}`, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      type: "PAID",
      orderId: session.metadata?.orderId,
      providerRef: session.id,
      raw: event,
    };
  }

  // تُرسل عند انتهاء صلاحية جلسة الدفع دون إتمامها — نُحرر المخزون المحجوز عندها
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      type: "FAILED",
      orderId: session.metadata?.orderId,
      providerRef: session.id,
      raw: event,
    };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    return { type: "REFUNDED", providerRef: paymentIntentId ?? charge.id, raw: event };
  }

  return { type: "UNKNOWN", providerRef: event.id, raw: event };
}

/**
 * paymentRef المخزّن في الطلب هو معرّف جلسة Checkout (cs_...)، لذا نجلب أولاً الـ
 * PaymentIntent المرتبط بها قبل تنفيذ الاسترداد الفعلي.
 */
async function refundStripePayment(paymentRef: string, amountInCents?: number): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(paymentRef);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new ApiError("PAYMENT_ERROR", "تعذر إيجاد عملية الدفع المرتبطة بهذا الطلب لاسترداد المبلغ", 400);
  }

  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountInCents !== undefined ? { amount: amountInCents } : {}),
  });
}

export const stripeProvider: PaymentProvider = {
  createSession: createStripeCheckoutSession,
  verifyWebhook: verifyStripeWebhook,
  refund: refundStripePayment,
};