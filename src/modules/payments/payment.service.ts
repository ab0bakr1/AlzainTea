import { ApiError } from "@/lib/api-error";
import { PaymentProvider, CreateSessionParams, CreateSessionResult, WebhookEvent } from "./payment.types";
import { stripeProvider } from "./providers/stripe.provider";
import { tapProvider } from "./providers/tap.provider";
import { moyasarProvider } from "./providers/moyasar.provider";

export type Gateway = "stripe" | "tap" | "moyasar";

const providers: Record<Gateway, PaymentProvider> = {
  stripe: stripeProvider,
  tap: tapProvider,
  moyasar: moyasarProvider,
};

// دول مجلس التعاون الخليجي التي تُوجَّه إلى البوابة المحلية بدلاً من Stripe
const GCC_COUNTRIES = new Set(["SA", "AE", "OM", "KW", "BH", "QA"]);

/**
 * يقرأ من .env أي بوابة خليجية مفعّلة حالياً (Tap أو Moyasar).
 * هذا هو الـ "Feature Flag": كلا المزودين مبرمجان بالكامل، لكن واحداً فقط نشط
 * في كل لحظة. التبديل بينهما لا يتطلب أي تعديل في checkout.service.ts أو
 * مسار الـ Webhook — فقط تغيير PAYMENT_PROVIDER في .env، مع إعادة تسجيل رابط
 * الـ Webhook (/api/webhooks/local-gateway) في لوحة تحكم المزوّد الجديد.
 */
export function getActiveLocalGateway(): Extract<Gateway, "tap" | "moyasar"> {
  const configured = (process.env.PAYMENT_PROVIDER ?? "tap").trim().toLowerCase();
  if (configured !== "tap" && configured !== "moyasar") {
    throw new ApiError(
      "CONFIG_ERROR",
      `قيمة PAYMENT_PROVIDER غير مدعومة: "${configured}" — يجب أن تكون "tap" أو "moyasar"`,
      500
    );
  }
  return configured;
}

/** يحدد بوابة الدفع المناسبة حسب دولة العميل: خليجية → المحلية المفعّلة حالياً، غير ذلك → Stripe */
export function resolveGateway(country: string): Gateway {
  return GCC_COUNTRIES.has(country.toUpperCase()) ? getActiveLocalGateway() : "stripe";
}

export async function createPaymentSession(
  gateway: Gateway,
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  return providers[gateway].createSession(params);
}

/** يتحقق من صحة حدث Webhook قادم من مزوّد معيّن ويحوّله لصيغة موحدة (WebhookEvent) */
export function verifyProviderWebhook(gateway: Gateway, rawBody: string, headers: Headers): WebhookEvent {
  return providers[gateway].verifyWebhook(rawBody, headers);
}

/** ينفّذ استرداداً (كاملاً أو جزئياً حسب دعم كل مزوّد) — يُستدعى من مسار إدارة الطلبات */
export async function refundPayment(
  gateway: Gateway,
  paymentRef: string,
  amountInMinorUnits?: number
): Promise<void> {
  return providers[gateway].refund(paymentRef, amountInMinorUnits);
}