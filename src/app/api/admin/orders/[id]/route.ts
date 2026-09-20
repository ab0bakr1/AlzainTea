import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { changeOrderStatusByAdmin, getAdminOrder } from "@/modules/orders/order.service";
import { orderIdParamSchema, updateOrderStatusSchema } from "@/modules/orders/order.validators";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/orders/[id] — تفاصيل الطلب كاملة + سجل الحالات
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin();
    const p = orderIdParamSchema.safeParse(await params);
    if (!p.success) return validationError(p.error);

    return ok(await getAdminOrder(p.data.id));
  } catch (error) {
    return fail(error);
  }
}

// PATCH /api/admin/orders/[id] — تغيير الحالة (مع المخزون والاسترداد تلقائياً)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    const p = orderIdParamSchema.safeParse(await params);
    if (!p.success) return validationError(p.error);

    const body = updateOrderStatusSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) return validationError(body.error);

    const order = await changeOrderStatusByAdmin(p.data.id, body.data, session.user.id);
    return ok(order);
  } catch (error) {
    return fail(error);
  }
}