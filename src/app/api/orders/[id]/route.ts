import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireUser } from "@/lib/require-user";
import { getMyOrder } from "@/modules/orders/order.service";
import { orderIdParamSchema } from "@/modules/orders/order.validators";

// GET /api/orders/[id] — تفاصيل طلب يملكه المستخدم
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const p = orderIdParamSchema.safeParse(await params);
    if (!p.success) return validationError(p.error);

    return ok(await getMyOrder(user.id, p.data.id));
  } catch (error) {
    return fail(error);
  }
}