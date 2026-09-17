import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export interface CreateOrderData {
  userId?: string;
  guestEmail?: string;
  country: string;
  currency: string;
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
 * ملاحظة: منطق "تحرير" المخزون المحجوز تلقائياً عند إلغاء/فشل/انتهاء صلاحية الطلب
 * سيُستكمل في وحدة إدارة المخزون الكاملة (الأسبوع 6 من خارطة الطريق).
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
        paymentMethod: "stripe",
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

/**
 * يُستدعى من Stripe Webhook بعد نجاح الدفع فعلياً (وليس بمجرد إعادة التوجيه).
 * مبني ليكون Idempotent: إن كان الطلب مدفوعاً مسبقاً لا يُعاد خصم المخزون مرة أخرى.
 */
export async function markOrderPaid(orderId: string) {
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
        statusHistory: { create: { status: "CONFIRMED", note: "تم تأكيد الدفع عبر Stripe Webhook" } },
      },
    });
  });
}