import crypto from "crypto";
import { ApiError } from "@/lib/api-error";
import { setOrderPaymentRef } from "@/modules/checkout/checkout.repository";
import {
  CreateSessionParams,
  CreateSessionResult,
  PaymentProvider,
  WebhookEvent,
} from "@/modules/payments/payment.types";
import { createTapCharge, refundTapCharge } from "@/lib/payment-gateway";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const TAP_WEBHOOK_SECRET = process.env.LOCAL_GATEWAY_WEBHOOK_SECRET ?? "";

async function createTapSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const charge = await createTapCharge({
    amount: params.amountInCents,
    currency: params.currency,
    orderId: params.orderId,
    customerEmail: params.customerEmail,
    successUrl: `${APP_URL}/checkout/success?orderId=${params.orderId}`,
    cancelUrl: `${APP_URL}/checkout/cancel?orderId=${params.orderId}`,
  });

  const redirectUrl: string | undefined = charge?.transaction?.url;
  if (!redirectUrl || !charge?.id) {
    throw new ApiError("PAYMENT_ERROR", "تعذر إنشاء جلسة الدفع عبر Tap", 502);
  }

  await setOrderPaymentRef(params.orderId, charge.id);

  return { url: redirectUrl, providerRef: charge.id };
}

/**
 * يتحقق من hashstring المرسل من Tap ضمن جسم حدث الـ Webhook (وليس ترويسة HTTP).
 *
 * الصيغة أدناه مبنية على توثيق Tap العلني المتاح وقت كتابة هذا الكود:
 *   HMAC-SHA256(secret_key, "x_id"+id+"x_amount"+amount+"x_currency"+currency+
 *                            "x_gateway_reference"+reference.gateway+
 *                            "x_payment_reference"+reference.payment+
 *                            "x_status"+status+"x_created"+transaction.created)
 *
 * ⚠️ مهم جداً قبل الإطلاق: بعض حسابات Tap (خصوصاً القديمة على goSell) قد تستخدم
 * ترتيب/تسمية حقول مختلفة قليلاً. يُنصح بشدة باختبار "Test Webhook" الفعلي من
 * لوحة تحكم Tap ومطابقة الحقول الحقيقية الواردة في الـ payload مع الأسماء أدناه
 * قبل قبول أي دفعة حقيقية.
 */
function verifyTapWebhook(rawBody: string, _headers: Headers): WebhookEvent {
  if (!TAP_WEBHOOK_SECRET) {
    throw new ApiError("MISSING_SIGNATURE", "سر تحقق Webhook الخاص بـ Tap غير مُهيأ", 400);
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiError("INVALID_PAYLOAD", "جسم Webhook الخاص بـ Tap غير صالح", 400);
  }

  const receivedHash: string | undefined = payload?.hashstring;
  if (!receivedHash) {
    throw new ApiError("MISSING_SIGNATURE", "حقل hashstring مفقود في حدث Tap", 400);
  }

  const gatewayReference = payload?.reference?.gateway ?? "";
  const paymentReference = payload?.reference?.payment ?? "";
  const created = payload?.transaction?.created ?? payload?.created ?? "";

  const toHash =
    `x_id${payload?.id ?? ""}` +
    `x_amount${payload?.amount ?? ""}` +
    `x_currency${payload?.currency ?? ""}` +
    `x_gateway_reference${gatewayReference}` +
    `x_payment_reference${paymentReference}` +
    `x_status${payload?.status ?? ""}` +
    `x_created${created}`;

  const computedHash = crypto.createHmac("sha256", TAP_WEBHOOK_SECRET).update(toHash).digest("hex");

  const isValid =
    computedHash.length === receivedHash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(receivedHash));

  if (!isValid) {
    throw new ApiError("INVALID_SIGNATURE", "توقيع Tap (hashstring) غير صالح", 400);
  }

  const orderId: string | undefined = payload?.metadata?.orderId ?? payload?.reference?.order;
  const status: string = payload?.status ?? "";

  const type =
    status === "CAPTURED" || status === "PAID"
      ? "PAID"
      : status === "REFUNDED"
        ? "REFUNDED"
        : status === "FAILED" || status === "DECLINED" || status === "CANCELLED"
          ? "FAILED"
          : "UNKNOWN";

  return { type, orderId, providerRef: payload.id, raw: payload };
}

async function refundTap(paymentRef: string, amountInMinorUnits?: number): Promise<void> {
  if (amountInMinorUnits !== undefined) {
    throw new ApiError(
      "NOT_IMPLEMENTED",
      "الاسترداد الجزئي عبر Tap غير مدعوم بعد في هذا الإصدار، فقط الاسترداد الكامل",
      501
    );
  }
  await refundTapCharge(paymentRef);
}

export const tapProvider: PaymentProvider = {
  createSession: createTapSession,
  verifyWebhook: verifyTapWebhook,
  refund: refundTap,
};