import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { changeOrderStatusByAdmin, getAdminOrder } from "@/modules/orders/order.service";
import { orderIdParamSchema, updateOrderStatusSchema } from "@/modules/orders/order.validators";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/orders/[id] — تفاصيل الطلب كاملة + سجل الحالات
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    await requireAdmin();
    return ok(await getAdminOrder(id));
  } catch (error) {
    return fail(error);
  }
}

// PATCH /api/admin/orders/[id] — تغيير الحالة (مع المخزون والاسترداد تلقائياً)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const session = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) return validationError(JSON.stringify(parsed.error));

    const order = await changeOrderStatusByAdmin(id, parsed.data, session.user.id);
    return ok(order);
  } catch (error) {
    return fail(error);
  }
}