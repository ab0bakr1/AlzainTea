import { sendEmail } from "@/lib/email";
import { buildOrderConfirmationEmail } from "./email-templates";
import {
  claimConfirmationEmail,
  findOrderForEmail,
  revertConfirmationEmailClaim,
} from "./notification.repository";

export interface SendResult {
  sent: boolean;
  reason?: string;
}

const num = (v: unknown) => Number(String(v));

/**
 * يرسل بريد تأكيد الطلب مرة واحدة فقط (Idempotent) ولا يرمي أخطاء أبداً،
 * حتى لا يؤثر فشل البريد على معالجة الـ Webhook.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<SendResult> {
  let claimed = false;
  try {
    const order = await findOrderForEmail(orderId);
    if (!order) return { sent: false, reason: "ORDER_NOT_FOUND" };
    if (order.paymentStatus !== "PAID") return { sent: false, reason: "NOT_PAID" };

    const to = order.user?.email ?? order.guestEmail;
    if (!to) return { sent: false, reason: "NO_RECIPIENT" };

    claimed = await claimConfirmationEmail(orderId);
    if (!claimed) return { sent: false, reason: "ALREADY_SENT" };

    const baseUrl = process.env.NEXTAUTH_URL;
    const { subject, html, text } = buildOrderConfirmationEmail({
      orderNumber: order.id.slice(-8).toUpperCase(),
      customerName: order.user?.name ?? order.shippingAddress?.fullName ?? "",
      currency: order.currency,
      subtotal: num(order.subtotal),
      discount: num(order.discount),
      shippingCost: num(order.shippingCost),
      tax: num(order.tax),
      total: num(order.total),
      items: order.items.map((i) => ({
        nameAr: i.product.nameAr,
        nameEn: i.product.nameEn,
        variantName: i.variant?.name ?? null,
        quantity: i.quantity,
        price: num(i.price),
      })),
      // الزائر لا يملك صفحة تتبع، فنضع الرابط للمسجلين فقط
      trackUrl: order.userId && baseUrl ? `${baseUrl}/account/orders/${order.id}` : undefined,
    });

    const result = await sendEmail({ to, subject, html, text });
    if (!result.ok) {
      await revertConfirmationEmailClaim(orderId);
      return { sent: false, reason: result.skipped ? "EMAIL_DISABLED" : "SEND_FAILED" };
    }
    return { sent: true };
  } catch (error) {
    console.error("[notifications] sendOrderConfirmationEmail failed:", error);
    if (claimed) await revertConfirmationEmailClaim(orderId).catch(() => {});
    return { sent: false, reason: "UNEXPECTED_ERROR" };
  }
}