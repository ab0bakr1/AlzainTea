// src/lib/payment-gateway.ts
//
// عملاء HTTP منخفضو المستوى لبوابتي الدفع الخليجيتين (Tap Payments وMoyasar) فقط.
// هذا الملف مسؤول حصراً عن استدعاءات الـ API الخام (إنشاء عملية دفع، استرداد).
//
// منطق الأعمال (تحويل العملات، بناء روابط النجاح/الإلغاء، التحقق من الـ Webhook،
// تسجيل paymentRef في الطلب) موجود في:
//   src/modules/payments/providers/tap.provider.ts
//   src/modules/payments/providers/moyasar.provider.ts
//
// اختيار المزوّد النشط حالياً (Feature Flag) يتم عبر PAYMENT_PROVIDER في .env،
// ويُقرأ من src/modules/payments/payment.service.ts (getActiveLocalGateway).

const TAP_API_BASE = "https://api.tap.company/v2";
const MOYASAR_API_BASE = "https://api.moyasar.com/v1";

const LOCAL_GATEWAY_API_KEY = process.env.LOCAL_GATEWAY_API_KEY ?? "";

if (!LOCAL_GATEWAY_API_KEY) {
  console.warn("⚠️  LOCAL_GATEWAY_API_KEY غير محددة — بوابتا Tap وMoyasar لن تعملا");
}

export interface CreateLocalSessionParams {
  /** المبلغ بأصغر وحدة للعملة (هللة/فلس) — نفس الوحدة المستخدمة في بقية النظام */
  amount: number;
  /** رمز العملة بحروف كبيرة، مثال: "SAR", "AED", "KWD" */
  currency: string;
  orderId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);

/**
 * Tap يتوقع المبلغ كرقم عشري بوحدة العملة الكاملة (مثال: 10.500 د.ك)،
 * بعكس Moyasar الذي يتوقع أصغر وحدة مباشرة (هللة/فلس) كرقم صحيح.
 */
function toTapMajorUnits(amountInMinorUnits: number, currency: string): number {
  const decimals = THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
  const divisor = 10 ** decimals;
  return Number((amountInMinorUnits / divisor).toFixed(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tap Payments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ينشئ عملية دفع (Charge) عبر Tap. يُستخدم source "src_all" لعرض كل وسائل الدفع
 * المفعّلة على حساب التاجر (بطاقات، mada، Apple Pay، KNET، Benefit... حسب الدولة).
 */
export async function createTapCharge(params: CreateLocalSessionParams) {
  const res = await fetch(`${TAP_API_BASE}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOCAL_GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toTapMajorUnits(params.amount, params.currency),
      currency: params.currency.toUpperCase(),
      customer_initiated: true,
      threeDSecure: true,
      customer: params.customerEmail ? { email: params.customerEmail } : undefined,
      source: { id: "src_all" },
      redirect: { url: params.successUrl },
      // رابط الـ Webhook الموحّد لكلا مزوّدي الخليج
      post: { url: `${process.env.NEXTAUTH_URL ?? ""}/api/webhooks/local-gateway` },
      reference: { order: params.orderId },
      metadata: { orderId: params.orderId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Tap charge creation failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/**
 * استرداد كامل فقط في هذا الإصدار (V1). الاسترداد الجزئي عبر Tap يتطلب تمرير
 * المبلغ بوحدة العملة الكاملة لنفس عملة الشحنة الأصلية — يُترك لإصدار V2 لتفادي
 * أخطاء تحويل العملة عند الاسترداد الجزئي.
 */
export async function refundTapCharge(chargeId: string) {
  const res = await fetch(`${TAP_API_BASE}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOCAL_GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      charge_id: chargeId,
      reason: "requested_by_customer",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tap refund failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Moyasar
// ─────────────────────────────────────────────────────────────────────────────

export async function createMoyasarPayment(params: CreateLocalSessionParams) {
  const res = await fetch(`${MOYASAR_API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${LOCAL_GATEWAY_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Moyasar يتوقع أصغر وحدة للعملة مباشرة (هللة)، بعكس Tap
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      description: `طلب متجر الزين للشاي #${params.orderId}`,
      callback_url: params.successUrl,
      source: { type: "creditcard" },
      metadata: { orderId: params.orderId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Moyasar payment creation failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/** Moyasar يدعم الاسترداد الجزئي أصلاً بنفس وحدة العملة الصغرى، دون حاجة لتحويل */
export async function refundMoyasarPayment(paymentId: string, amountInMinorUnits?: number) {
  const res = await fetch(`${MOYASAR_API_BASE}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${LOCAL_GATEWAY_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: amountInMinorUnits !== undefined ? JSON.stringify({ amount: amountInMinorUnits }) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Moyasar refund failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}