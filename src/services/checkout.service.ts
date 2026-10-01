// src/services/checkout.service.ts
// طبقة استدعاء الـ API الخاصة بصفحة إتمام الشراء.
// لا منطق أعمال هنا — فقط نقل الطلبات وتطبيع الاستجابات (ok/fail) إلى أنواع واضحة.

import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ---------------------------------------------------------------------------
// الأنواع
// ---------------------------------------------------------------------------
export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode: string | null;
  isDefault: boolean;
}

export interface NewAddressInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode?: string;
  isDefault?: boolean;
}

/** كل المبالغ هنا بالدولار (USD) — عملة تسعير المنتجات الأساسية. */
export interface ShippingQuote {
  cost: number;
  estimatedDays: string | null;
}

export interface CouponResult {
  code: string;
  /** قيمة الخصم بالدولار */
  discount: number;
}

export interface CheckoutSessionBody {
  items: { productId: string; variantId?: string; quantity: number }[];
  country: string;
  addressId?: string;
  guestAddress?: {
    fullName: string;
    phone: string;
    city: string;
    street: string;
    postalCode?: string;
  };
  guestEmail?: string;
  couponCode?: string;
  vatNumber?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  orderId: string | null;
}

export interface ParsedApiError {
  code?: string;
  status?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// الأخطاء
// ---------------------------------------------------------------------------
export function parseApiError(err: unknown, fallback = "حدث خطأ غير متوقع"): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 429) {
      return {
        code: "TOO_MANY_REQUESTS",
        status,
        message: "عدد الطلبات كبير خلال وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.",
      };
    }
    const apiError = err.response?.data?.error;
    return { code: apiError?.code, status, message: apiError?.message ?? fallback };
  }
  return { message: err instanceof Error ? err.message : fallback };
}

// ---------------------------------------------------------------------------
// العناوين (مسجل)
// ---------------------------------------------------------------------------
export async function fetchAddresses(): Promise<SavedAddress[]> {
  const { data } = await api.get("/addresses");
  const payload = data.data;
  return Array.isArray(payload) ? payload : (payload?.items ?? []);
}

export async function createAddress(input: NewAddressInput): Promise<SavedAddress> {
  const { data } = await api.post("/addresses", input);
  return data.data;
}

// ---------------------------------------------------------------------------
// الشحن
// ---------------------------------------------------------------------------
export async function fetchShippingQuote(country: string): Promise<ShippingQuote | null> {
  const { data } = await api.get("/shipping/calculate", { params: { country } });
  const d = data.data ?? {};
  const cost = Number(d.cost ?? d.shippingCost ?? d.rate ?? d.price);
  if (!Number.isFinite(cost)) return null;
  const days = d.estimatedDays ?? d.days ?? null;
  return { cost, estimatedDays: days != null ? String(days) : null };
}

// ---------------------------------------------------------------------------
// الكوبون
// ---------------------------------------------------------------------------
export async function validateCoupon(params: {
  code: string;
  subtotal: number;
  userId?: string;
}): Promise<CouponResult> {
  const { data } = await api.post("/coupons/validate", params);
  const d = data.data ?? {};
  const discount = Number(d.discount ?? d.discountAmount ?? d.amount ?? 0);
  return {
    code: String(d.code ?? params.code).toUpperCase(),
    discount: Number.isFinite(discount) ? discount : 0,
  };
}

// ---------------------------------------------------------------------------
// جلسة الدفع
// ---------------------------------------------------------------------------
export async function createCheckoutSession(
  body: CheckoutSessionBody
): Promise<CheckoutSessionResult> {
  const { data } = await api.post("/checkout/session", body);
  const d = data.data ?? {};
  return {
    checkoutUrl: d.checkoutUrl ?? d.url ?? d.paymentUrl ?? "",
    orderId: d.orderId ?? d.order?.id ?? null,
  };
}