import { ApiError } from "@/lib/api-error";
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  planTransition,
  type OrderStatusValue,
} from "./order-status";
import {
  claimRefund,
  findAdminOrders,
  findOrderCore,
  findOrderDetail,
  findStalePendingOrders,
  findUserOrderDetail,
  findUserOrders,
  revertRefundClaim,
  transitionOrderTx,
  type OrderCore,
} from "./order.repository";
import { refundOrderPayment } from "./order-refund.adapter";
import type {
  AdminOrdersQuery,
  MyOrdersQuery,
  UpdateOrderStatusInput,
} from "./order.validators";

/** منطق الأعمال لدورة حياة الطلب — لا يتعامل مع Request/Response */

type Actor = { type: "admin" | "customer" | "system"; id?: string };

function buildNote(actor: Actor, note?: string): string {
  const tag = actor.type === "system" ? "[system]" : `[${actor.type}:${actor.id ?? "?"}]`;
  return note ? `${tag} ${note}` : tag;
}

const notFound = () => new ApiError("ORDER_NOT_FOUND", "الطلب غير موجود", 404);

// ---------------------------------------------------------------------------
// القراءة
// ---------------------------------------------------------------------------

export async function getAdminOrders(query: AdminOrdersQuery) {
  const { items, total } = await findAdminOrders(query);
  return {
    items,
    meta: { page: query.page, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getAdminOrder(id: string) {
  const order = await findOrderDetail(id);
  if (!order) throw notFound();
  return order;
}

export async function getMyOrders(userId: string, query: MyOrdersQuery) {
  const { items, total } = await findUserOrders(userId, query.page, query.limit);
  return {
    items,
    meta: { page: query.page, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getMyOrder(userId: string, id: string) {
  // نُرجع 404 (وليس 403) لعدم كشف وجود طلبات الآخرين
  const order = await findUserOrderDetail(userId, id);
  if (!order) throw notFound();
  return order;
}

// ---------------------------------------------------------------------------
// المحرك المشترك للانتقال بين الحالات
// ---------------------------------------------------------------------------

async function executeTransition(
  order: OrderCore,
  to: OrderStatusValue,
  opts: { actor: Actor; note?: string; restock?: boolean }
): Promise<void> {
  const decision = planTransition(
    { status: order.status, paymentStatus: order.paymentStatus },
    to,
    { restock: opts.restock }
  );
  if (!decision.ok) throw new ApiError(decision.code, decision.message, 409);
  const { plan } = decision;

  // (1) الاسترداد المالي أولاً — مع قفل يمنع النقر المزدوج/الطلبات المتزامنة
  if (plan.refund) {
    const claimed = await claimRefund(order.id);
    if (!claimed) {
      throw new ApiError("REFUND_IN_PROGRESS", "عملية استرداد جارية أو مكتملة لهذا الطلب", 409);
    }
    try {
      await refundOrderPayment(order);
    } catch (err) {
      await revertRefundClaim(order.id);
      console.error(`[orders] فشل الاسترداد order=${order.id}`, err);
      if (err instanceof ApiError) throw err;
      throw new ApiError("REFUND_FAILED", "تعذّر تنفيذ الاسترداد لدى بوابة الدفع", 502);
    }
  }

  // (2) تحديث الحالة + المخزون + السجل في معاملة واحدة
  try {
    await transitionOrderTx({
      orderId: order.id,
      from: order.status,
      to,
      stock: plan.stock,
      paymentStatus: plan.paymentStatus,
      note: buildNote(opts.actor, opts.note),
    });
  } catch (err) {
    if (plan.refund) {
      // المال رُدّ لكن قاعدة البيانات لم تُحدَّث — يحتاج مراجعة يدوية
      console.error(`[orders] CRITICAL: refund issued but transition failed order=${order.id}`, err);
    }
    throw err;
  }
}

async function getCoreOrThrow(id: string): Promise<OrderCore> {
  const order = await findOrderCore(id);
  if (!order) throw notFound();
  return order;
}

// ---------------------------------------------------------------------------
// عمليات الإدارة
// ---------------------------------------------------------------------------

export async function changeOrderStatusByAdmin(
  orderId: string,
  input: UpdateOrderStatusInput,
  adminId: string
) {
  const order = await getCoreOrThrow(orderId);
  await executeTransition(order, input.status, {
    actor: { type: "admin", id: adminId },
    note: input.note,
    restock: input.restock,
  });
  return getAdminOrder(orderId);
}

// ---------------------------------------------------------------------------
// عمليات العميل
// ---------------------------------------------------------------------------

export async function cancelMyOrder(userId: string, orderId: string, reason?: string) {
  const order = await getCoreOrThrow(orderId);
  if (order.userId !== userId) throw notFound();

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(
      "ORDER_NOT_CANCELLABLE",
      "لا يمكن إلغاء الطلب بعد بدء تجهيزه، تواصل مع الدعم",
      409
    );
  }

  await executeTransition(order, "CANCELLED", {
    actor: { type: "customer", id: userId },
    note: reason ?? "إلغاء من العميل",
  });
  return getMyOrder(userId, orderId);
}

// ---------------------------------------------------------------------------
// تحرير المخزون المحجوز للطلبات المنتهية (Cron)
// ---------------------------------------------------------------------------

export async function expireStalePendingOrders(minutes = 60, batch = 100) {
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const stale = await findStalePendingOrders(cutoff, batch);

  let released = 0;
  let skipped = 0;

  for (const order of stale) {
    try {
      await executeTransition(order, "FAILED", {
        actor: { type: "system" },
        note: `انتهت مهلة الدفع (${minutes} دقيقة) وتم تحرير المخزون المحجوز`,
      });
      released++;
    } catch (err) {
      // غالباً دُفع الطلب في نفس اللحظة (ORDER_STATE_CONFLICT) — نتجاهله
      skipped++;
      console.warn(`[orders] تعذّر إنهاء الطلب ${order.id}`, err);
    }
  }

  return { scanned: stale.length, released, skipped };
}