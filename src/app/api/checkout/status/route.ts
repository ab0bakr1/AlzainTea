import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { orderTrackingQuerySchema } from "@/modules/checkout/order-tracking.validators";
import { getOrderStatusByToken } from "@/modules/checkout/order-tracking.service";

// GET /api/checkout/status?orderId=...&token=...
// حالة الطلب بعد الدفع للزائر والمسجل معاً، بحماية رمز التتبع الموقّع.
export async function GET(req: NextRequest) {
  try {
    const parsed = orderTrackingQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    if (!parsed.success) return validationError(parsed.error.message);

    const order = await getOrderStatusByToken(parsed.data.orderId, parsed.data.token);

    const res = ok(order);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error) {
    return fail(error);
  }
}