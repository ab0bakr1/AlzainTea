import { prisma } from "@/lib/prisma";

export function findOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      guestEmail: true,
      paymentStatus: true,
      currency: true,
      subtotal: true,
      discount: true,
      shippingCost: true,
      tax: true,
      total: true,
      user: { select: { email: true, name: true } },
      shippingAddress: { select: { fullName: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { nameAr: true, nameEn: true } },
          variant: { select: { name: true } },
        },
      },
    },
  });
}

/** حجز ذري: ينجح مرة واحدة فقط لكل طلب */
export async function claimConfirmationEmail(orderId: string): Promise<boolean> {
  const res = await prisma.order.updateMany({
    where: { id: orderId, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: new Date() },
  });
  return res.count === 1;
}

export async function revertConfirmationEmailClaim(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId },
    data: { confirmationEmailSentAt: null },
  });
}