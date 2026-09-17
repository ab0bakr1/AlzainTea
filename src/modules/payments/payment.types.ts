export interface CreateSessionParams {
  orderId: string;
  amountInCents: number;
  currency: string; // رمز العملة بحروف صغيرة، مثال: "usd"
  customerEmail?: string;
}

export interface CreateSessionResult {
  url: string;
  providerRef: string;
}

export interface PaymentProvider {
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;
}