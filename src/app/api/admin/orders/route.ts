import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { getAdminOrders } from "@/modules/orders/order.service";
import {
  adminOrdersQuerySchema,
  searchParamsToObject,
} from "@/modules/orders/order.validators";

// GET /api/admin/orders — قائمة الطلبات للإدارة مع الفلترة والترقيم
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = adminOrdersQuerySchema.safeParse(
      searchParamsToObject(req.nextUrl.searchParams)
    );
    if (!parsed.success) return validationError(parsed.error.message);

    const { items, meta } = await getAdminOrders(parsed.data);
    return ok(items, meta);
  } catch (error) {
    return fail(error);
  }
}