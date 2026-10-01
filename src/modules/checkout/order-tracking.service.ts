import { ApiError } from "@/lib/api-error";
import { verifyTrackingToken } from "./order-tracking";
import { findOrderForTracking } from "./order-tracking.repository";

/**
 * يرجع نفس الخطأ 404 لرمز خاطئ ولطلب غير موجود،
 * حتى لا يمكن استكشاف وجود الطلبات (ID Enumeration).
 */
export async function getOrderStatusByToken(orderId: string, token: string) {
  const notFound = () => new ApiError("ORDER_NOT_FOUND", "الطلب غير موجود", 404);

  if (!verifyTrackingToken(orderId, token)) throw notFound();

  const order = await findOrderForTracking(orderId);
  if (!order) throw notFound();

  return order;
}