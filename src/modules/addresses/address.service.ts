// src/modules/addresses/address.service.ts

import { ApiError } from "@/lib/api-error";
import {
  createAddressForUser,
  deleteAddress,
  findAddressById,
  listAddressesByUser,
  updateAddressForUser,
} from "./address.repository";
import { AddressInput, UpdateAddressInput } from "./address.validators";

/** "" أو مسافات في الرمز البريدي تُخزَّن كـ null. لا نلمس الحقل إن لم يُرسل أصلاً (تعديل جزئي). */
function normalizePostalCode<T extends { postalCode?: string | null }>(input: T): T {
  if (!("postalCode" in input)) return input;
  return { ...input, postalCode: input.postalCode?.trim() || null };
}

export function getUserAddresses(userId: string) {
  return listAddressesByUser(userId);
}

export function addAddress(userId: string, input: AddressInput) {
  return createAddressForUser(userId, normalizePostalCode(input));
}

export async function editAddress(userId: string, addressId: string, input: UpdateAddressInput) {
  const address = await findAddressById(addressId);
  if (!address || address.userId !== userId) {
    throw new ApiError("ADDRESS_NOT_FOUND", "العنوان غير موجود", 404);
  }
  return updateAddressForUser(userId, addressId, normalizePostalCode(input));
}

export async function removeAddress(userId: string, addressId: string) {
  const address = await findAddressById(addressId);
  if (!address || address.userId !== userId) {
    throw new ApiError("ADDRESS_NOT_FOUND", "العنوان غير موجود", 404);
  }
  return deleteAddress(addressId);
}

// تُستخدم من وحدة Checkout للتأكد أن عنوان الشحن المُرسل يخص صاحب الطلب فعلاً
export async function assertAddressOwnership(userId: string, addressId: string) {
  const address = await findAddressById(addressId);
  if (!address || address.userId !== userId) {
    throw new ApiError("ADDRESS_NOT_FOUND", "عنوان الشحن غير موجود", 404);
  }
  return address;
}