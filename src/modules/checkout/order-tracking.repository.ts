import { prisma } from "@/lib/prisma";

/** حقول آمنة للعرض للزائر: لا عنوان، لا هاتف، لا بريد، لا ملاحظات إدارية. */
export function findOrderForTracking(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      currency: true,
      subtotal: true,
      discount: true,
      shippingCost: true,
      tax: true,
      total: true,
      country: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: { select: { nameAr: true, nameEn: true, images: true } },
          variant: { select: { name: true } },
        },
      },
    },
  });
}