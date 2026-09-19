export interface CreateSessionParams {
  orderId: string;
  /** المبلغ بأصغر وحدة للعملة (سنت/هللة/فلس) — التحويل يتم في checkout.service قبل الاستدعاء */
  amountInCents: number;
  /** رمز العملة: بحروف صغيرة لـ Stripe (مثال "usd")، وبحروف كبيرة لـ Tap/Moyasar (مثال "SAR") */
  currency: string;
  customerEmail?: string;
}

export interface CreateSessionResult {
  url: string;
  providerRef: string;
}

export type PaymentEventType = "PAID" | "FAILED" | "REFUNDED" | "UNKNOWN";

export interface WebhookEvent {
  type: PaymentEventType;
  orderId?: string;
  /** مُعرّف المزوّد للعملية (session id لدى Stripe، charge id لدى Tap، payment id لدى Moyasar) */
  providerRef: string;
  /** الحدث الخام كما وصل من المزوّد، للتدقيق أو الاستخدامات المستقبلية */
  raw: unknown;
}

export interface PaymentProvider {
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;

  /**
   * يتحقق من صحة الحدث الوارد (توقيع Stripe، hashstring لدى Tap، secret_token لدى Moyasar)
   * ويحوّله لصيغة موحدة (WebhookEvent). يجب أن يرمي ApiError عند فشل التحقق،
   * ولا يُعيد قيمة صامتة تعتبر الحدث صالحاً بالخطأ.
   */
  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent;

  /** استرداد كامل، أو جزئي إن كان المزوّد يدعمه (راجع كل provider على حدة) */
  refund(paymentRef: string, amountInMinorUnits?: number): Promise<void>;
}