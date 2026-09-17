import { PaymentProvider, CreateSessionParams, CreateSessionResult } from "./payment.types";
import { createStripeCheckoutSession } from "./providers/stripe.provider";

const stripeProvider: PaymentProvider = { createSession: createStripeCheckoutSession };

// عند اكتمال تكامل Tap/Moyasar (الأسبوع القادم حسب خارطة الطريق)
// يُضاف هنا مزوّد "local" بنفس الواجهة، دون أي تعديل على checkout.service.ts
const providers = {
  stripe: stripeProvider,
} as const;

export type Gateway = keyof typeof providers;

export async function createPaymentSession(
  gateway: Gateway,
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  return providers[gateway].createSession(params);
}