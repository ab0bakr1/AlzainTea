// src/modules/addresses/address.repository.ts

import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { AddressInput, UpdateAddressInput } from "./address.validators";

export function listAddressesByUser(userId: string) {
  // ترتيب ثانوي ثابت: بدونه يتغير ترتيب العناوين في الواجهة بعد كل تعديل
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
}

export function findAddressById(id: string) {
  return prisma.address.findUnique({ where: { id } });
}

export function createAddress(userId: string, data: AddressInput) {
  return prisma.address.create({ data: { ...data, userId } });
}

export function updateAddress(id: string, data: UpdateAddressInput) {
  return prisma.address.update({ where: { id }, data });
}

export function clearDefaultAddresses(userId: string) {
  return prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
}

/** إنشاء عنوان ذرياً: أول عنوان للمستخدم يصبح افتراضياً دائماً، وتصفير الافتراضي السابق في نفس المعاملة. */
export function createAddressForUser(userId: string, data: AddressInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.count({ where: { userId } });
    const isDefault = data.isDefault || existing === 0;
    if (isDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...data, isDefault, userId } });
  });
}

/** تعديل عنوان ذرياً مع تصفير الافتراضي السابق عند تعيين هذا العنوان افتراضياً. */
export function updateAddressForUser(userId: string, id: string, data: UpdateAddressInput) {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return tx.address.update({ where: { id }, data });
  });
}

export async function deleteAddress(id: string) {
  try {
    return await prisma.address.delete({ where: { id } });
  } catch (error) {
    // P2003: العنوان مرتبط بطلبات سابقة (Order.shippingAddressId) فلا يمكن حذفه
    if ((error as { code?: string } | null)?.code === "P2003") {
      throw new ApiError(
        "ADDRESS_IN_USE",
        "لا يمكن حذف هذا العنوان لأنه مرتبط بطلبات سابقة",
        409
      );
    }
    throw error;
  }
}