import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireUser } from "@/lib/require-user";
import { getMyOrders } from "@/modules/orders/order.service";
import { myOrdersQuerySchema, searchParamsToObject } from "@/modules/orders/order.validators";

// GET /api/orders — طلبات المستخدم الحالي
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const parsed = myOrdersQuerySchema.safeParse(searchParamsToObject(req.nextUrl.searchParams));
    if (!parsed.success) return validationError(parsed.error.message);

    const { items, meta } = await getMyOrders(user.id, parsed.data);
    return ok(items, meta);
  } catch (error) {
    return fail(error);
  }
}