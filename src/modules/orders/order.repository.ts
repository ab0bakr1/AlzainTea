import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import type {
  OrderStatusValue,
  PaymentStatusValue,
  StockEffect,
} from "./order-status";
import type { AdminOrdersQuery } from "./order.validators";

/** الطبقة الوحيدة المسموح لها باستدعاء Prisma في موديول الطلبات */

const listSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  currency: true,
  total: true,
  country: true,
  guestEmail: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const detailInclude = {
  user: { select: { id: true, name: true, email: true } },
  coupon: { select: { code: true } },
  shippingAddress: true,
  items: {
    include: {
      product: { select: { id: true, nameAr: true, nameEn: true, slug: true, images: true } },
      variant: { select: { id: true, name: true, sku: true } },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

const coreSelect = {
  id: true,
  userId: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentRef: true,
  currency: true,
  total: true,
} satisfies Prisma.OrderSelect;

export type OrderCore = Prisma.OrderGetPayload<{ select: typeof coreSelect }>;

// ---------------------------------------------------------------------------
// القراءة
// ---------------------------------------------------------------------------

export async function findAdminOrders(f: AdminOrdersQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(f.status && { status: f.status }),
    ...(f.paymentStatus && { paymentStatus: f.paymentStatus }),
    ...(f.country && { country: f.country }),
    ...((f.from || f.to) && {
      createdAt: { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) },
    }),
    ...(f.q && {
      OR: [
        { id: { contains: f.q, mode: "insensitive" } },
        { paymentRef: { contains: f.q, mode: "insensitive" } },
        { guestEmail: { contains: f.q, mode: "insensitive" } },
        { user: { email: { contains: f.q, mode: "insensitive" } } },
        { user: { name: { contains: f.q, mode: "insensitive" } } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total };
}

export function findOrderDetail(id: string) {
  return prisma.order.findUnique({ where: { id }, include: detailInclude });
}

export function findUserOrderDetail(userId: string, id: string) {
  return prisma.order.findFirst({ where: { id, userId }, include: detailInclude });
}

export async function findUserOrders(userId: string, page: number, limit: number) {
  const where: Prisma.OrderWhereInput = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

export function findOrderCore(id: string): Promise<OrderCore | null> {
  return prisma.order.findUnique({ where: { id }, select: coreSelect });
}

/** طلبات بانتظار الدفع تجاوزت المهلة وما زالت تحجز مخزوناً */
export function findStalePendingOrders(cutoff: Date, limit: number): Promise<OrderCore[]> {
  return prisma.order.findMany({
    where: { status: "PENDING", paymentStatus: "UNPAID", createdAt: { lt: cutoff } },
    select: coreSelect,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// حماية الاسترداد من التكرار (Refund Lock)
// ---------------------------------------------------------------------------

/** يحجز عملية الاسترداد: PAID → PENDING. يعيد false إن سبقه طلب آخر. */
export async function claimRefund(orderId: string): Promise<boolean> {
  const r = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: "PAID" },
    data: { paymentStatus: "PENDING" },
  });
  return r.count === 1;
}

/** يتراجع عن الحجز إذا فشل الاسترداد لدى البوابة */
export async function revertRefundClaim(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID" },
  });
}

// ---------------------------------------------------------------------------
// الانتقال الذري بين الحالات + أثر المخزون
// ---------------------------------------------------------------------------

async function applyStockEffect(
  tx: Prisma.TransactionClient,
  orderId: string,
  effect: StockEffect
): Promise<void> {
  if (effect === "NONE") return;

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });

  // ترتيب ثابت لتفادي Deadlocks بين معاملات متزامنة
  items.sort((a, b) =>
    `${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`)
  );

  for (const item of items) {
    // المتغيرات: خُصمت من stock مباشرة وقت الحجز، لذا الإرجاع دائماً increment
    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      continue;
    }

    if (effect === "RELEASE_RESERVED") {
      const r = await tx.product.updateMany({
        where: { id: item.productId, reservedStock: { gte: item.quantity } },
        data: { reservedStock: { decrement: item.quantity } },
      });
      if (r.count === 0) {
        // لا نوقف الإلغاء بسبب خلل محاسبي، لكن نسجله للمراجعة
        console.error(
          `[orders] reservedStock أقل من المطلوب تحريره — order=${orderId} product=${item.productId} qty=${item.quantity}`
        );
      }
    } else {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
}

export interface TransitionInput {
  orderId: string;
  from: OrderStatusValue;
  to: OrderStatusValue;
  stock: StockEffect;
  paymentStatus?: PaymentStatusValue;
  note?: string;
}

/**
 * ينفذ داخل معاملة واحدة:
 * 1) Compare-and-Set على الحالة الحالية (يمنع التنفيذ المزدوج / السباقات)
 * 2) أثر المخزون
 * 3) سجل التدقيق OrderStatusLog
 */
export async function transitionOrderTx(input: TransitionInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: input.orderId, status: input.from },
      data: {
        status: input.to,
        ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
      },
    });

    if (claimed.count === 0) {
      throw new ApiError(
        "ORDER_STATE_CONFLICT",
        "تغيّرت حالة الطلب أثناء المعالجة، أعد تحميل الصفحة وحاول مجدداً",
        409
      );
    }

    await applyStockEffect(tx, input.orderId, input.stock);

    await tx.orderStatusLog.create({
      data: { orderId: input.orderId, status: input.to, note: input.note ?? null },
    });
  });
}