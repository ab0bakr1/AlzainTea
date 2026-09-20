import { z } from "zod";
import {
  ADMIN_SETTABLE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "./order-status";

/** يحوّل URLSearchParams إلى كائن ويحذف القيم الفارغة */
export function searchParamsToObject(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((value, key) => {
    if (value.trim() !== "") out[key] = value;
  });
  return out;
}

export const orderIdParamSchema = z.object({
  id: z.string().min(1, { error: "معرّف الطلب مطلوب" }),
});

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  country: z.string().trim().length(2).transform((v) => v.toUpperCase()).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type MyOrdersQuery = z.infer<typeof myOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ADMIN_SETTABLE_STATUSES, { error: "حالة الطلب غير صالحة" }),
  note: z.string().trim().max(500, { error: "الملاحظة طويلة جداً" }).optional(),
  /** يُستخدم فقط عند الانتقال إلى RETURNED: هل تعود الكمية للمخزون؟ */
  restock: z.boolean().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;