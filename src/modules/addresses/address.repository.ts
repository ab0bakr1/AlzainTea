import { prisma } from "@/lib/prisma";
import { AddressInput, UpdateAddressInput } from "./address.validators";

export function listAddressesByUser(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: { isDefault: "desc" } });
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

export function deleteAddress(id: string) {
  return prisma.address.delete({ where: { id } });
}

export function clearDefaultAddresses(userId: string) {
  return prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
}