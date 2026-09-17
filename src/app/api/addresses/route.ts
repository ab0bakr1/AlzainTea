import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { addressSchema } from "@/modules/addresses/address.validators";
import { addAddress, getUserAddresses } from "@/modules/addresses/address.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول", 401);

    const addresses = await getUserAddresses(session.user.id);
    return ok(addresses);
  } catch (err) {
    return fail(err as ApiError);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول", 401);

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const address = await addAddress(session.user.id, parsed.data);
    return ok(address);
  } catch (err) {
    return fail(err as ApiError);
  }
}