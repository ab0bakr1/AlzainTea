// src/services/order-result.service.ts
// قراءة حالة الطلب في صفحة نتيجة الدفع + حفظ رمز التتبع محلياً.
// الرمز يُحفظ قبل الانتقال لصفحة الدفع، لأن روابط العودة من البوابات لا تحمله.

import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export interface PublicOrder {
  id: string;
  status: string;
  paymentStatus: string;
  currency: string;
  subtotal: string;
  discount: string;
  shippingCost: string;
  tax: string;
  total: string;
  country: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: string;
    product: { nameAr: string; nameEn: string; images: string[] };
    variant: { name: string } | null;
  }[];
}

export async function fetchOrderStatus(orderId: string, token: string): Promise<PublicOrder> {
  const { data } = await api.get("/checkout/status", { params: { orderId, token } });
  return data.data;
}

const TOKEN_PREFIX = "alzain-order-token:";

export function saveTrackingToken(orderId: string, token: string) {
  try {
    localStorage.setItem(TOKEN_PREFIX + orderId, token);
  } catch {
    /* التخزين غير متاح: تعمل الصفحة بوضع التأكيد العام */
  }
}

export function readTrackingToken(orderId: string): string | null {
  try {
    return localStorage.getItem(TOKEN_PREFIX + orderId);
  } catch {
    return null;
  }
}