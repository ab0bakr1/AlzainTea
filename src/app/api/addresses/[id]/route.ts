import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { updateAddressSchema } from "@/modules/addresses/address.validators";
import { editAddress, removeAddress } from "@/modules/addresses/address.service";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول", 401);

    const body = await req.json();
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const address = await editAddress(session.user.id, params.id, parsed.data);
    return ok(address);
  } catch (err) {
    return fail(err as ApiError);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول", 401);

    await removeAddress(session.user.id, params.id);
    return ok({ deleted: true });
  } catch (err) {
    return fail(err as ApiError);
  }
}