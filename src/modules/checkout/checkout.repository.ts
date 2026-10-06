import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export interface CreateOrderData {
  userId?: string;
  guestEmail?: string;
  country: string;
  currency: string;
  /** "stripe" | "tap" | "moyasar" — يُحدَّد ديناميكياً في checkout.service حسب دولة العميل */
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  vatNumber?: string;
  couponId?: string;
  shippingAddressId?: string;
  items: { productId: string; variantId?: string; quantity: number; price: number }[];
}

/**
 * ينشئ الطلب ويحجز المخزون (reservedStock للمنتجات، خصم مباشر لمخزون المتغيرات)
 * داخل معاملة واحدة (Prisma Transaction) لمنع البيع الزائد (Overselling)
 * عند تزامن أكثر من عملية شراء على نفس المنتج.
 *
 * ملاحظة: إن فشل الدفع أو انتهت صلاحية الجلسة، يُحرَّر هذا الحجز عبر releaseReservedStock
 * أدناه (تُستدعى من معالجات الـ Webhook)، وكذلك عبر Cron /api/cron/expire-orders للطلبات
 * التي تجاوزت مهلة 60 دقيقة (order.service.expireStalePendingOrders).
 */
export async function createOrderWithStockReservation(data: CreateOrderData) {
  return prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant || variant.stock < item.quantity) {
          throw new ApiError("OUT_OF_STOCK", "أحد المتغيرات المطلوبة غير متوفر بالكمية الكافية", 409);
        }
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock - product.reservedStock < item.quantity) {
          throw new ApiError("OUT_OF_STOCK", "أحد المنتجات غير متوفر بالكمية الكافية", 409);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { reservedStock: { increment: item.quantity } },
        });
      }
    }

    const order = await tx.order.create({
      data: {
        userId: data.userId,
        guestEmail: data.guestEmail,
        country: data.country,
        currency: data.currency,
        subtotal: data.subtotal,
        discount: data.discount,
        shippingCost: data.shippingCost,
        tax: data.tax,
        total: data.total,
        vatNumber: data.vatNumber,
        couponId: data.couponId,
        shippingAddressId: data.shippingAddressId,
        paymentMethod: data.paymentMethod,
        paymentStatus: "UNPAID",
        status: "PENDING",
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        statusHistory: { create: { status: "PENDING", note: "تم إنشاء الطلب وهو بانتظار الدفع" } },
      },
      include: { items: true },
    });

    return order;
  });
}

export function setOrderPaymentRef(orderId: string, paymentRef: string) {
  return prisma.order.update({ where: { id: orderId }, data: { paymentRef } });
}

export function findOrderByPaymentRef(paymentRef: string) {
  return prisma.order.findUnique({ where: { paymentRef }, include: { items: true } });
}

export function findOrderById(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

export type MarkOrderPaidResult =
  | { outcome: "CONFIRMED"; order: NonNullable<Awaited<ReturnType<typeof findOrderById>>> }
  /** الطلب مدفوع أصلاً (أو مُسترد/قيد استرداد) — حدث مكرر، لا أثر */
  | { outcome: "ALREADY_PAID" }
  /** وصلت دفعة لطلب لم يعد قابلاً للتأكيد (FAILED / CANCELLED ...) — يلزم استرداد يدوي */
  | { outcome: "NOT_PAYABLE"; status: string; paymentStatus: string }
  | { outcome: "NOT_FOUND" };

/**
 * يُستدعى من أي Webhook (Stripe أو البوابة المحلية) بعد نجاح الدفع فعلياً.
 *
 * Idempotent وآمن تحت التزامن: التأكيد يتم بتحديث شرطي ذري (Compare-and-Set)
 *   updateMany({ where: { id, status: "PENDING", paymentStatus: "UNPAID" } })
 * فإذا وصل الحدث نفسه مرتين في اللحظة ذاتها ينجح أحدهما فقط (count === 1) ويخصم المخزون،
 * ويخرج الآخر بـ ALREADY_PAID دون أي أثر. ولا يُؤكَّد طلب انتهى/أُلغي (FAILED/CANCELLED)
 * مهما تأخر وصول الدفعة — يُعاد NOT_PAYABLE ليتولى المستدعي التنبيه والاسترداد اليدوي،
 * بدل إعادة طلب نهائي إلى CONFIRMED وإفساد reservedStock.
 *
 * gatewayLabel اختياري، يُستخدم فقط لنص سجل الحالة (OrderStatusLog) لتوضيح مصدر التأكيد.
 */
export async function markOrderPaid(
  orderId: string,
  gatewayLabel = "المزوّد"
): Promise<MarkOrderPaidResult> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING", paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });

    if (claimed.count === 0) {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (!current) return { outcome: "NOT_FOUND" as const };
      // PENDING = حجز استرداد جارٍ، REFUNDED = استُرد: كلاهما يعني أن الدفع تم سابقاً
      if (["PAID", "PENDING", "REFUNDED"].includes(current.paymentStatus)) {
        return { outcome: "ALREADY_PAID" as const };
      }
      return {
        outcome: "NOT_PAYABLE" as const,
        status: current.status,
        paymentStatus: current.paymentStatus,
      };
    }

    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new ApiError("ORDER_NOT_FOUND", "الطلب غير موجود", 404);

    // ترتيب ثابت لتفادي Deadlocks بين معاملات متزامنة (نفس نهج order.repository)
    const items = [...order.items].sort((a, b) =>
      `${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`)
    );

    for (const item of items) {
      if (item.variantId) continue; // مخزون المتغيرات خُصم مباشرة عند الحجز
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });
    }

    await tx.orderStatusLog.create({
      data: {
        orderId,
        status: "CONFIRMED",
        note: `تم تأكيد الدفع عبر ${gatewayLabel} Webhook`,
      },
    });

    return { outcome: "CONFIRMED" as const, order };
  });
}

/**
 * يُستدعى عند فشل الدفع أو انتهاء صلاحية جلسة الدفع (Webhook). يُعيد المخزون المحجوز
 * (reservedStock للمنتجات العادية)، أو يُعيد الكمية المخصومة مباشرة (للمتغيرات، لأن حجزها
 * يخصم من stock فوراً عند الإنشاء).
 *
 * Idempotent وآمن تحت التزامن: الانتقال PENDING/UNPAID → FAILED بتحديث شرطي ذري،
 * فلا يُحرَّر مخزون طلب مدفوع (يتنافس مع markOrderPaid على نفس الشرط فيربح أحدهما فقط)،
 * ولا يتكرر التحرير لطلب فشل أو أُلغي مسبقاً. يُعيد الطلب بحالته الحالية في كل الأحوال.
 */
export async function releaseReservedStock(orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING", paymentStatus: "UNPAID" },
      data: { status: "FAILED", paymentStatus: "FAILED" },
    });

    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || claimed.count === 0) return order;

    const items = [...order.items].sort((a, b) =>
      `${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`)
    );

    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
    }

    await tx.orderStatusLog.create({ data: { orderId, status: "FAILED", note: reason } });

    return order;
  });
}

/**
 * يسجّل ملاحظة تدقيق نظامية على الطلب (دفعة متأخرة، استرداد من لوحة المزود، عدم تطابق مبلغ...)
 * بحالته الحالية دون تغييرها، لتظهر للإدارة في سجل الحالة. الوسم [system] يتبع نفس
 * اصطلاح order.service (buildNote) لتمييزها كملاحظة داخلية.
 */
export async function addOrderAuditNote(orderId: string, note: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return;
  await prisma.orderStatusLog.create({
    data: { orderId, status: order.status, note: `[system] ${note}` },
  });
}

/**
 * يُستدعى من مسار إدارة الطلبات بعد تنفيذ استرداد ناجح عبر provider.refund().
 * لا يُعيد المخزون تلقائياً هنا (قرار تجاري: هل البضاعة المرتجعة صالحة لإعادة البيع؟) —
 * يُترك تحديث المخزون الفعلي لواجهة إدارة المرتجعات القادمة (الأسبوع 6).
 */
export async function markOrderRefunded(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== "PAID") {
    throw new ApiError("VALIDATION_ERROR", "لا يمكن استرداد طلب لم يُدفع بعد", 400);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "REFUNDED",
      status: "REFUNDED",
      statusHistory: { create: { status: "REFUNDED", note: "تم استرداد المبلغ للعميل" } },
    },
  });
}