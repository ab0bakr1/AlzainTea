import crypto from "crypto";
import { ApiError } from "@/lib/api-error";
import { setOrderPaymentRef } from "@/modules/checkout/checkout.repository";
import {
  CreateSessionParams,
  CreateSessionResult,
  PaymentProvider,
  WebhookEvent,
} from "@/modules/payments/payment.types";
import { createMoyasarPayment, refundMoyasarPayment } from "@/lib/payment-gateway";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const MOYASAR_WEBHOOK_SECRET = process.env.LOCAL_GATEWAY_WEBHOOK_SECRET ?? "";

async function createMoyasarSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const payment = await createMoyasarPayment({
    amount: params.amountInCents,
    currency: params.currency,
    orderId: params.orderId,
    customerEmail: params.customerEmail,
    successUrl: `${APP_URL}/checkout/success?orderId=${params.orderId}`,
    cancelUrl: `${APP_URL}/checkout/cancel?orderId=${params.orderId}`,
  });

  const redirectUrl: string | undefined = payment?.source?.transaction_url ?? payment?.url;
  if (!redirectUrl || !payment?.id) {
    throw new ApiError("PAYMENT_ERROR", "تعذر إنشاء جلسة الدفع عبر Moyasar", 502);
  }

  await setOrderPaymentRef(params.orderId, payment.id);

  return { url: redirectUrl, providerRef: payment.id };
}

/**
 * توثيق Moyasar الرسمي: لا يوجد توقيع HMAC للـ Webhook، بل يُعاد إرسال secret_token
 * (الذي تُعرّفه أنت عند إنشاء الـ Webhook من لوحة Moyasar) ضمن جسم الحدث نفسه.
 * التحقق الصحيح الوحيد هنا هو مقارنته بالسر المخزّن في LOCAL_GATEWAY_WEBHOOK_SECRET
 * بطريقة Constant-Time (crypto.timingSafeEqual) لمنع هجمات Timing Attack.
 */
function verifyMoyasarWebhook(rawBody: string, _headers: Headers): WebhookEvent {
  if (!MOYASAR_WEBHOOK_SECRET) {
    throw new ApiError("MISSING_SIGNATURE", "سر تحقق Webhook الخاص بـ Moyasar غير مُهيأ", 400);
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiError("INVALID_PAYLOAD", "جسم Webhook الخاص بـ Moyasar غير صالح", 400);
  }

  const receivedToken: string = payload?.secret_token ?? "";
  const expected = Buffer.from(MOYASAR_WEBHOOK_SECRET);
  const received = Buffer.from(receivedToken);

  const isValid = received.length === expected.length && crypto.timingSafeEqual(received, expected);

  if (!isValid) {
    throw new ApiError("INVALID_SIGNATURE", "secret_token الخاص بـ Moyasar غير صالح", 400);
  }

  const data = payload?.data ?? {};
  const status: string = data?.status ?? "";
  const eventType: string = payload?.type ?? "";

  const type =
    eventType === "payment_paid" || status === "paid"
      ? "PAID"
      : eventType === "payment_refunded" || status === "refunded"
        ? "REFUNDED"
        : eventType === "payment_failed" || eventType === "payment_voided" || status === "failed"
          ? "FAILED"
          : "UNKNOWN";

  const orderId: string | undefined = data?.metadata?.orderId;

  return { type, orderId, providerRef: data.id, raw: payload };
}

/** Moyasar يدعم الاسترداد الجزئي أصلاً بنفس وحدة العملة الصغرى، دون حاجة لتحويل عملة */
async function refundMoyasar(paymentRef: string, amountInMinorUnits?: number): Promise<void> {
  await refundMoyasarPayment(paymentRef, amountInMinorUnits);
}

export const moyasarProvider: PaymentProvider = {
  createSession: createMoyasarSession,
  verifyWebhook: verifyMoyasarWebhook,
  refund: refundMoyasar,
};