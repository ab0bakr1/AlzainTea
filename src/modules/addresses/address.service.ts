import { ApiError } from "@/lib/api-error";
import {
  clearDefaultAddresses,
  createAddress,
  deleteAddress,
  findAddressById,
  listAddressesByUser,
  updateAddress,
} from "./address.repository";
import { AddressInput, UpdateAddressInput } from "./address.validators";

export function getUserAddresses(userId: string) {
  return listAddressesByUser(userId);
}

export async function addAddress(userId: string, input: AddressInput) {
  if (input.isDefault) {
    await clearDefaultAddresses(userId);
  }
  return createAddress(userId, input);
}

export async function editAddress(userId: string, addressId: string, input: UpdateAddressInput) {
  const address = await findAddressById(addressId);
  if (!address || address.userId !== userId) {
    throw new ApiError("ADDRESS_NOT_FOUND", "العنوان غير موجود", 404);
  }
  if (input.isDefault) {
    await clearDefaultAddresses(userId);
  }
  return updateAddress(addressId, input);
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