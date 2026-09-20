import axios from "axios";
import type { OrderStatusValue, PaymentStatusValue } from "@/modules/orders/order-status";

const api = axios.create({ baseURL: "/api" });

// ---------------------------------------------------------------------------
// الأنواع (Prisma Decimal تصل كنص عبر JSON)
// ---------------------------------------------------------------------------
export interface OrderListItem {
  id: string;
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  paymentMethod: string;
  currency: string;
  total: string;
  country: string;
  guestEmail: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  _count: { items: number };
}

export interface OrderDetail extends Omit<OrderListItem, "_count"> {
  paymentRef: string | null;
  subtotal: string;
  discount: string;
  shippingCost: string;
  tax: string;
  vatNumber: string | null;
  notes: string | null;
  coupon: { code: string } | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    country: string;
    city: string;
    street: string;
    postalCode: string | null;
  } | null;
  items: {
    id: string;
    quantity: number;
    price: string;
    product: { id: string; nameAr: string; nameEn: string; slug: string; images: string[] };
    variant: { id: string; name: string; sku: string } | null;
  }[];
  statusHistory: { id: string; status: OrderStatusValue; note: string | null; createdAt: string }[];
}

export interface PageMeta {
  page: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface AdminOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatusValue | "";
  paymentStatus?: PaymentStatusValue | "";
  q?: string;
}

export function getApiErrorMessage(err: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error?.message ?? fallback;
  return fallback;
}

function clean<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
}

// ---------------------------------------------------------------------------
// الإدارة
// ---------------------------------------------------------------------------
export async function fetchAdminOrders(params: AdminOrdersParams): Promise<Paginated<OrderListItem>> {
  const { data } = await api.get("/admin/orders", { params: clean(params) });
  return { items: data.data, meta: data.meta };
}

export async function fetchAdminOrder(id: string): Promise<OrderDetail> {
  const { data } = await api.get(`/admin/orders/${id}`);
  return data.data;
}

export async function updateAdminOrderStatus(
  id: string,
  body: { status: OrderStatusValue; note?: string; restock?: boolean }
): Promise<OrderDetail> {
  const { data } = await api.patch(`/admin/orders/${id}`, body);
  return data.data;
}

// ---------------------------------------------------------------------------
// العميل
// ---------------------------------------------------------------------------
export async function fetchMyOrders(page = 1): Promise<Paginated<OrderListItem>> {
  const { data } = await api.get("/orders", { params: { page } });
  return { items: data.data, meta: data.meta };
}

export async function fetchMyOrder(id: string): Promise<OrderDetail> {
  const { data } = await api.get(`/orders/${id}`);
  return data.data;
}

export async function cancelMyOrder(id: string, reason?: string): Promise<OrderDetail> {
  const { data } = await api.post(`/orders/${id}/cancel`, { reason });
  return data.data;
}