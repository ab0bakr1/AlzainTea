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

const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);
const decimalsFor = (currency: string) => (THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2);

/**
 * المفاتيح المقبولة لحساب hashstring. وثائق Tap تذكر أن التوقيع يُحسب بالمفتاح السري
 * (Secret API Key) لحساب التاجر، لذا نقبل LOCAL_GATEWAY_WEBHOOK_SECRET وكذلك
 * LOCAL_GATEWAY_API_KEY (كلاهما سر لا يُكشف)، فلا يتعطل التحقق إن ضُبط أحدهما فقط.
 */
function candidateSecrets(): string[] {
  return [process.env.LOCAL_GATEWAY_WEBHOOK_SECRET, process.env.LOCAL_GATEWAY_API_KEY].filter(
    (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
  );
}

function safeEqualHex(a: string, b: string): boolean {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

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
 * يتحقق من hashstring المرسل من Tap (ضمن جسم الحدث، مع احتياط ترويسة hashstring).
 *
 * الصيغة المعتمدة (توثيق Tap):
 *   HMAC-SHA256(secret_key, "x_id"+id+"x_amount"+amount+"x_currency"+currency+
 *                            "x_gateway_reference"+reference.gateway+
 *                            "x_payment_reference"+reference.payment+
 *                            "x_status"+status+"x_created"+transaction.created)
 *
 * حقل amount يُقبل بصيغتين: كما ورد في JSON، أو مُنسَّقاً بعدد خانات العملة العشرية
 * (مثل "100.00" أو "10.500") لأن Tap تُنسّقه هكذا عند حساب التوقيع. قبول كلتا الصيغتين
 * آمن لأن التحقق يبقى HMAC بالسر؛ أي تلاعب بأي حقل يُبطل التوقيع.
 *
 * ⚠️ قبل قبول أي دفعة حقيقية: أرسل "Test Webhook" من لوحة Tap وتأكد من وصول 200
 * (راجع قائمة الفحص في CLAUDE.md). ما زال هذا التحقق بحاجة لحدث حقيقي من حسابكم.
 */
function verifyTapWebhook(rawBody: string, headers: Headers): WebhookEvent {
  const secrets = candidateSecrets();
  if (secrets.length === 0) {
    throw new ApiError("MISSING_SIGNATURE", "سر تحقق Webhook الخاص بـ Tap غير مُهيأ", 400);
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiError("INVALID_PAYLOAD", "جسم Webhook الخاص بـ Tap غير صالح", 400);
  }

  const receivedHash: string | undefined = payload?.hashstring ?? headers.get("hashstring") ?? undefined;
  if (!receivedHash) {
    throw new ApiError("MISSING_SIGNATURE", "حقل hashstring مفقود في حدث Tap", 400);
  }

  const currency: string = payload?.currency ?? "";
  const rawAmount = String(payload?.amount ?? "");
  const numericAmount = Number(payload?.amount);
  const amountCandidates = [rawAmount];
  if (Number.isFinite(numericAmount) && currency) {
    const formatted = numericAmount.toFixed(decimalsFor(currency));
    if (!amountCandidates.includes(formatted)) amountCandidates.push(formatted);
  }

  const gatewayReference = payload?.reference?.gateway ?? "";
  const paymentReference = payload?.reference?.payment ?? "";
  const created = payload?.transaction?.created ?? payload?.created ?? "";

  const buildToHash = (amount: string) =>
    `x_id${payload?.id ?? ""}` +
    `x_amount${amount}` +
    `x_currency${currency}` +
    `x_gateway_reference${gatewayReference}` +
    `x_payment_reference${paymentReference}` +
    `x_status${payload?.status ?? ""}` +
    `x_created${created}`;

  const isValid = secrets.some((secret) =>
    amountCandidates.some((amount) => {
      const computed = crypto.createHmac("sha256", secret).update(buildToHash(amount)).digest("hex");
      return safeEqualHex(computed, receivedHash);
    })
  );

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

  // Tap يرسل المبلغ بوحدة العملة الكاملة؛ نحوّله لأصغر وحدة لمطابقته مع إجمالي الطلب
  const amountInMinorUnits =
    Number.isFinite(numericAmount) && currency
      ? Math.round(numericAmount * 10 ** decimalsFor(currency))
      : undefined;

  return {
    type,
    orderId,
    providerRef: payload.id,
    amountInMinorUnits,
    currency: currency ? currency.toUpperCase() : undefined,
    raw: payload,
  };
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