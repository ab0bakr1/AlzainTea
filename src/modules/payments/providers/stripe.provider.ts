import { stripe } from "@/lib/stripe";
import { ApiError } from "@/lib/api-error";
import { setOrderPaymentRef } from "@/modules/checkout/checkout.repository";
import { CreateSessionParams, CreateSessionResult } from "@/modules/payments/payment.types";

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