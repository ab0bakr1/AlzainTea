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
 * أدناه (تُستدعى من معالجات الـ Webhook). التحرير التلقائي المبني على مهلة زمنية
 * (Timeout job) لا يزال يُستكمل ضمن وحدة إدارة المخزون الكاملة (الأسبوع 6).
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

/**
 * يُستدعى من أي Webhook (Stripe أو البوابة المحلية) بعد نجاح الدفع فعلياً.
 * مبني ليكون Idempotent: إن كان الطلب مدفوعاً مسبقاً لا يُعاد خصم المخزون مرة أخرى.
 * gatewayLabel اختياري، يُستخدم فقط لنص سجل الحالة (OrderStatusLog) لتوضيح مصدر التأكيد.
 */
export async function markOrderPaid(orderId: string, gatewayLabel = "المزوّد") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentStatus === "PAID") {
      return order;
    }

    for (const item of order.items) {
      if (item.variantId) continue; // مخزون المتغيرات خُصم مباشرة عند الحجز
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        statusHistory: { create: { status: "CONFIRMED", note: `تم تأكيد الدفع عبر ${gatewayLabel} Webhook` } },
      },
    });
  });
}

/**
 * يُستدعى عند فشل الدفع أو انتهاء صلاحية جلسة الدفع (Webhook)، أو مستقبلاً عند
 * إلغاء الطلب يدوياً. يُعيد المخزون المحجوز (reservedStock للمنتجات العادية)،
 * أو يُعيد الكمية المخصومة مباشرة (للمتغيرات، لأن حجزها يخصم من stock فوراً عند الإنشاء).
 *
 * مبني ليكون Idempotent: لا يُحرَّر مخزون طلب مدفوع بالفعل، ولا يُكرَّر التحرير
 * لطلب فشل أو أُلغي مسبقاً (لمنع إعادة المخزون مرتين عند تكرار نفس حدث الـ Webhook).
 */
export async function releaseReservedStock(orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return null;

    if (order.paymentStatus === "PAID" || order.status === "CANCELLED" || order.status === "FAILED") {
      return order;
    }

    for (const item of order.items) {
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

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        paymentStatus: "FAILED",
        statusHistory: { create: { status: "FAILED", note: reason } },
      },
    });
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