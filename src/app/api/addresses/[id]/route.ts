import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/require-user"; // ✅ جديد
import { updateAddressSchema } from "@/modules/addresses/address.validators";
import { editAddress, removeAddress } from "@/modules/addresses/address.service";

// ✅ معدّل: params أصبح Promise وفق Next.js 15/16
interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: Params) {
  try {
    const { id } = await context.params; // ✅ معدّل: نُقل داخل try، وبصيغة context.params
    const user = await requireUser(); // ✅ معدّل

    const body = await req.json();
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const address = await editAddress(user.id, id, parsed.data);
    return ok(address);
  } catch (err) {
    return fail(err as ApiError);
  }
}

export async function DELETE(_req: NextRequest, context: Params) {
  try {
    const { id } = await context.params; // ✅ معدّل
    const user = await requireUser(); // ✅ معدّل

    await removeAddress(user.id, id);
    return ok({ deleted: true });
  } catch (err) {
    return fail(err as ApiError);
  }
}