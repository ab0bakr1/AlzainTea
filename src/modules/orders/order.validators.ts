import { z } from "zod";
import {
  ADMIN_SETTABLE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatusValue,
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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** نص تاريخ صالح (YYYY-MM-DD أو ISO كامل) */
const dateParam = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), { error: "تاريخ غير صالح" });

export const adminOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    country: z.string().trim().length(2).transform((v) => v.toUpperCase()).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    from: dateParam.transform((v) => new Date(v)).optional(),
    /** تاريخ بدون وقت (YYYY-MM-DD) يشمل اليوم كاملاً حتى 23:59:59.999 (UTC) */
    to: dateParam
      .transform((v) => {
        const d = new Date(v);
        if (DATE_ONLY.test(v)) d.setUTCHours(23, 59, 59, 999);
        return d;
      })
      .optional(),
  })
  .refine((v) => !v.from || !v.to || v.from.getTime() <= v.to.getTime(), {
    error: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
    path: ["to"],
  });
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

/** مجموعات حالات الطلب لفلترة قائمة العميل (تُترجم إلى قائمة OrderStatus في الـ Repository) */
export const MY_ORDER_GROUPS = ["awaiting_payment", "in_progress", "completed", "closed"] as const;
export type MyOrderGroup = (typeof MY_ORDER_GROUPS)[number];

export const MY_ORDER_GROUP_STATUSES: Record<MyOrderGroup, OrderStatusValue[]> = {
  awaiting_payment: ["PENDING"],
  in_progress: ["CONFIRMED", "PROCESSING", "SHIPPED"],
  completed: ["DELIVERED"],
  closed: ["CANCELLED", "RETURNED", "REFUNDED", "FAILED"],
};

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  group: z.enum(MY_ORDER_GROUPS, { error: "فلتر الطلبات غير صالح" }).optional(),
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