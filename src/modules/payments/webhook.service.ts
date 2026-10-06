import { ApiError } from "@/lib/api-error";
import {
  addOrderAuditNote,
  findOrderByPaymentRef,
  markOrderPaid,
  releaseReservedStock,
} from "@/modules/checkout/checkout.repository";
import { resolveOrderPaymentRef, verifyProviderWebhook, type Gateway } from "./payment.service";
import type { WebhookEvent } from "./payment.types";

/**
 * منطق معالجة أحداث الدفع الموحّد لكل المزودين (Stripe / Tap / Moyasar).
 * مسارا الـ Webhook رقيقان: يستقبلان الطلب، ويستدعيان هذه الخدمة، ثم يرجعان 200.
 * لا يتعامل هذا الملف مع Request/Response ولا مع Prisma مباشرة.
 */

export type WebhookOutcome =
  | "CONFIRMED" // تم تأكيد الدفع الآن
  | "DUPLICATE" // حدث مكرر لطلب مدفوع أصلاً
  | "RELEASED" // فشل الدفع: حُرّر المخزون (أو كان محرراً)
  | "IGNORED" // حدث لا يتطلب إجراء
  | "ANOMALY"; // شذوذ سُجّل وتنبّه له، لم يُغيَّر الطلب تلقائياً

export interface WebhookResult {
  outcome: WebhookOutcome;
  /** إن وُجد: يجب على المسار جدولة بريد التأكيد عبر after() (آمن للتكرار: حجز ذري) */
  confirmationEmailOrderId?: string;
}

// ---------------------------------------------------------------------------
// التحقق والتنبيه
// ---------------------------------------------------------------------------

/**
 * يتحقق من الحدث، وأي فشل (توقيع/جسم/إعداد ناقص) يُحوَّل إلى 400 برسالة عامة موحّدة.
 * التفاصيل الحقيقية تُسجَّل في الخادم فقط ولا تُعاد للمُرسِل (لا تسريب لتفاصيل داخلية).
 */
export function verifyWebhookOrReject(gateway: Gateway, rawBody: string, headers: Headers): WebhookEvent {
  try {
    return verifyProviderWebhook(gateway, rawBody, headers);
  } catch (err) {
    console.error(`[WEBHOOK:${gateway}] verification failed`, err);
    throw new ApiError("INVALID_SIGNATURE", "تعذر التحقق من الحدث الوارد", 400);
  }
}

/**
 * نقطة التنبيه الموحّدة لكل الشذوذات المالية (دفعة بلا طلب، دفعة متأخرة، عدم تطابق مبلغ...).
 * حالياً تُسجَّل بصيغة JSON ثابتة البادئة [WEBHOOK_ANOMALY] ليسهل ربطها بتنبيه في سجلات
 * Vercel. عند اعتماد Sentry/Slack يكفي إضافة الاستدعاء هنا فقط.
 */
export function reportWebhookAnomaly(kind: string, details: Record<string, unknown>): void {
  console.error(`[WEBHOOK_ANOMALY] ${kind}`, JSON.stringify(details));
  // TODO: Sentry.captureMessage(`[WEBHOOK_ANOMALY] ${kind}`, { extra: details, level: "error" });
}

// ---------------------------------------------------------------------------
// مطابقة المبلغ (دفاع إضافي بعد التوقيع)
// ---------------------------------------------------------------------------

const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR"]);
const decimalsFor = (currency: string) => (THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2);

/**
 * الوضع الافتراضي "warn": عدم التطابق يُسجَّل ويُنبَّه له دون منع تأكيد الطلب، لأن الفحص
 * جديد ولم يُختبر بعد بدفعات حقيقية من كل مزود (خطر رفض دفعة مشروعة أسوأ من تمريرها،
 * فالحدث موقَّع أصلاً). بعد التأكد في Staging من عدم وجود إنذارات كاذبة اضبط
 * WEBHOOK_AMOUNT_CHECK="enforce" ليُمنع تأكيد الطلب عند عدم التطابق.
 */
function amountCheckMode(): "warn" | "enforce" {
  return process.env.WEBHOOK_AMOUNT_CHECK === "enforce" ? "enforce" : "warn";
}

/** إجمالي الطلب في DB عمود Decimal(10,2)؛ نسمح بفارق أكبر للعملات ثلاثية الخانات (تقريب الخانة الثالثة) */
export function checkPaidAmount(
  order: { total: unknown; currency: string },
  event: Pick<WebhookEvent, "amountInMinorUnits" | "currency">
): { ok: true } | { ok: false; reason: string; expected: number; received?: number } {
  if (event.amountInMinorUnits === undefined || !event.currency) return { ok: true }; // لا بيانات للمقارنة

  const orderCurrency = order.currency.toUpperCase();
  const expected = Math.round(Number(String(order.total)) * 10 ** decimalsFor(orderCurrency));

  if (event.currency.toUpperCase() !== orderCurrency) {
    return { ok: false, reason: "CURRENCY_MISMATCH", expected, received: event.amountInMinorUnits };
  }

  const tolerance = decimalsFor(orderCurrency) === 3 ? 10 : 1;
  if (Math.abs(expected - event.amountInMinorUnits) > tolerance) {
    return { ok: false, reason: "AMOUNT_MISMATCH", expected, received: event.amountInMinorUnits };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// المعالجة حسب نوع الحدث
// ---------------------------------------------------------------------------

export async function handlePaymentEvent(
  gateway: Gateway,
  gatewayLabel: string,
  event: WebhookEvent
): Promise<WebhookResult> {
  switch (event.type) {
    case "PAID":
      return handlePaid(gatewayLabel, event);
    case "FAILED":
      return handleFailed(gatewayLabel, event);
    case "REFUNDED":
      return handleExternalRefund(gateway, gatewayLabel, event);
    default:
      return { outcome: "IGNORED" };
  }
}

async function handlePaid(gatewayLabel: string, event: WebhookEvent): Promise<WebhookResult> {
  const order = await findOrderByPaymentRef(event.providerRef);

  if (!order) {
    // دفعة ناجحة بلا طلب مطابق = خلل حقيقي؛ نرجع 200 لمنع إعادة الإرسال اللانهائية لكن ننبّه
    reportWebhookAnomaly("PAID_WITHOUT_ORDER", {
      gateway: gatewayLabel,
      orderId: event.orderId,
      providerRef: event.providerRef,
    });
    return { outcome: "ANOMALY" };
  }

  if (event.orderId && event.orderId !== order.id) {
    reportWebhookAnomaly("ORDER_ID_MISMATCH", {
      gateway: gatewayLabel,
      eventOrderId: event.orderId,
      matchedOrderId: order.id,
      providerRef: event.providerRef,
    });
    return { outcome: "ANOMALY" };
  }

  if (order.paymentStatus === "UNPAID") {
    const check = checkPaidAmount(order, event);
    if (!check.ok) {
      reportWebhookAnomaly(check.reason, {
        gateway: gatewayLabel,
        orderId: order.id,
        providerRef: event.providerRef,
        expectedMinor: check.expected,
        receivedMinor: check.received,
        orderCurrency: order.currency,
        eventCurrency: event.currency,
        mode: amountCheckMode(),
      });
      if (amountCheckMode() === "enforce") {
        await addOrderAuditNote(
          order.id,
          `⚠️ رُفض تأكيد الدفع تلقائياً (${check.reason}) عبر ${gatewayLabel} — راجع الدفعة يدوياً. ref=${event.providerRef}`
        );
        return { outcome: "ANOMALY" };
      }
    }
  }

  const result = await markOrderPaid(order.id, gatewayLabel);

  switch (result.outcome) {
    case "CONFIRMED":
      return { outcome: "CONFIRMED", confirmationEmailOrderId: order.id };

    case "ALREADY_PAID":
      // نعيد جدولة البريد أيضاً: الحجز الذري يمنع التكرار، ويعالج حالة تعطّل المعالجة
      // الأولى بعد التأكيد وقبل إرسال البريد
      return { outcome: "DUPLICATE", confirmationEmailOrderId: order.id };

    case "NOT_PAYABLE":
      // المال وصل لكن الطلب انتهى/أُلغي (مثلاً دفع بعد مهلة الـ Cron): لا نعيد طلباً نهائياً
      // إلى CONFIRMED؛ نسجّل ونُنبّه ليُسترد المبلغ يدوياً من لوحة المزوّد
      reportWebhookAnomaly("LATE_PAYMENT_ON_CLOSED_ORDER", {
        gateway: gatewayLabel,
        orderId: order.id,
        orderStatus: result.status,
        paymentStatus: result.paymentStatus,
        providerRef: event.providerRef,
      });
      await addOrderAuditNote(
        order.id,
        `⚠️ وصلت دفعة عبر ${gatewayLabel} بعد أن أصبح الطلب ${result.status} — يلزم استرداد المبلغ يدوياً. ref=${event.providerRef}`
      );
      return { outcome: "ANOMALY" };

    default:
      reportWebhookAnomaly("PAID_ORDER_NOT_FOUND_IN_TX", {
        gateway: gatewayLabel,
        orderId: order.id,
        providerRef: event.providerRef,
      });
      return { outcome: "ANOMALY" };
  }
}

async function handleFailed(gatewayLabel: string, event: WebhookEvent): Promise<WebhookResult> {
  // الأولوية لـ orderId من metadata، وإلا نطابق الطلب عبر paymentRef
  let orderId = event.orderId;
  if (!orderId) {
    orderId = (await findOrderByPaymentRef(event.providerRef))?.id;
  }
  if (!orderId) return { outcome: "IGNORED" };

  await releaseReservedStock(orderId, `فشلت أو انتهت صلاحية عملية الدفع عبر ${gatewayLabel}`);
  return { outcome: "RELEASED" };
}

/**
 * استرداد مصدره لوحة المزوّد مباشرة (خارج النظام). لا نغيّر حالة الطلب تلقائياً لأن القرار
 * (إلغاء؟ إعادة للمخزون؟ استرداد جزئي؟) تجاري؛ نسجّل ونُنبّه فقط.
 * أما الاستردادات التي بدأها النظام نفسه (claimRefund) فتكون paymentStatus ≠ PAID فتُتجاهل.
 */
async function handleExternalRefund(
  gateway: Gateway,
  gatewayLabel: string,
  event: WebhookEvent
): Promise<WebhookResult> {
  const paymentRef = await resolveOrderPaymentRef(gateway, event);
  const order = paymentRef ? await findOrderByPaymentRef(paymentRef) : null;
  if (!order) return { outcome: "IGNORED" };

  if (order.paymentStatus !== "PAID") return { outcome: "DUPLICATE" };

  reportWebhookAnomaly("EXTERNAL_REFUND", {
    gateway: gatewayLabel,
    orderId: order.id,
    providerRef: event.providerRef,
  });
  await addOrderAuditNote(
    order.id,
    `⚠️ رُصد استرداد (كلي أو جزئي) من لوحة ${gatewayLabel} خارج النظام — حدّث حالة الطلب يدوياً. ref=${event.providerRef}`
  );
  return { outcome: "ANOMALY" };
}