import { ApiError } from "@/lib/api-error";
import { fromSmallestUnit } from "@/lib/currency";
import { setOrderPaymentRef } from "@/modules/checkout/checkout.repository";
import { CreateSessionParams, CreateSessionResult } from "@/modules/payments/payment.types";

// مزوّد البوابة الخليجية المحلية (Tap أو Moyasar حسب PAYMENT_PROVIDER في .env).
// يطبّق نفس واجهة PaymentProvider الموحّدة المستخدمة مع Stripe (payment.types.ts)،
// لذا لا يحتاج checkout.service لأي معرفة بتفاصيل المزوّد الفعلي.

type LocalGatewayName = "tap" | "moyasar";

const PROVIDER = (process.env.PAYMENT_PROVIDER as LocalGatewayName) ?? "tap";
const API_KEY = process.env.LOCAL_GATEWAY_API_KEY ?? "";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function createLocalGatewaySession(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  if (!API_KEY) {
    throw new ApiError(
      "PAYMENT_ERROR",
      "بوابة الدفع المحلية غير مهيأة (LOCAL_GATEWAY_API_KEY مفقود)",
      502
    );
  }

  const redirectUrl = `${APP_URL}/checkout/success?orderId=${params.orderId}`;

  const { id, url } =
    PROVIDER === "moyasar"
      ? await createMoyasarPayment(params, redirectUrl)
      : await createTapCharge(params, redirectUrl);

  if (!id || !url) {
    throw new ApiError("PAYMENT_ERROR", "تعذّر إنشاء جلسة الدفع عبر البوابة المحلية", 502);
  }

  await setOrderPaymentRef(params.orderId, id);

  return { url, providerRef: id };
}

// ─── Tap Payments ─────────────────────────────────────────────
// Tap يتوقع المبلغ كرقم عشري (وليس بالوحدة الأصغر)، لذا نعكس toSmallestUnit هنا
async function createTapCharge(params: CreateSessionParams, redirectUrl: string) {
  const res = await fetch("https://api.tap.company/v2/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: fromSmallestUnit(params.amountInCents, params.currency),
      currency: params.currency.toUpperCase(),
      customer: params.customerEmail ? { email: params.customerEmail } : undefined,
      // src_all: يسمح للعميل باختيار طريقة الدفع (بطاقة، Apple Pay، mada) من واجهة Tap نفسها
      source: { id: "src_all" },
      redirect: { url: redirectUrl },
      metadata: { orderId: params.orderId },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError("PAYMENT_ERROR", data?.message ?? "فشل إنشاء جلسة الدفع عبر Tap", 502);
  }

  return {
    id: data.id as string | undefined,
    url: data.transaction?.url as string | undefined,
  };
}

// ─── Moyasar ──────────────────────────────────────────────────
// Moyasar (مثل Stripe) يتوقع المبلغ بالوحدة الأصغر مباشرة (هللات/فلوس)
async function createMoyasarPayment(params: CreateSessionParams, redirectUrl: string) {
  const res = await fetch("https://api.moyasar.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountInCents,
      currency: params.currency.toUpperCase(),
      description: `طلب متجر الزين للشاي #${params.orderId}`,
      callback_url: redirectUrl,
      source: { type: "creditcard" },
      metadata: { orderId: params.orderId },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError("PAYMENT_ERROR", data?.message ?? "فشل إنشاء جلسة الدفع عبر Moyasar", 502);
  }

  return {
    id: data.id as string | undefined,
    url: data.source?.transaction_url as string | undefined,
  };
}