import type { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireUser } from "@/lib/require-user";
import { cancelMyOrder } from "@/modules/orders/order.service";
import { cancelOrderSchema, orderIdParamSchema } from "@/modules/orders/order.validators";

// POST /api/orders/[id]/cancel — إلغاء العميل لطلبه (قبل بدء التجهيز)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const p = orderIdParamSchema.safeParse(await params);
    if (!p.success) return validationError(p.error.message);

    const body = cancelOrderSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) return validationError(body.error.message);

    return ok(await cancelMyOrder(user.id, p.data.id, body.data.reason));
  } catch (error) {
    return fail(error);
  }
}