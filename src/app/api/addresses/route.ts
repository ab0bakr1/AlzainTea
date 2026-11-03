import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/require-user"; // ✅ جديد: بدل getServerSession + authOptions
import { addressSchema } from "@/modules/addresses/address.validators";
import { addAddress, getUserAddresses } from "@/modules/addresses/address.service";

export async function GET() {
  try {
    const user = await requireUser(); // ✅ معدّل: بدل فحص الجلسة اليدوي

    const addresses = await getUserAddresses(user.id);
    return ok(addresses);
  } catch (err) {
    return fail(err as ApiError);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(); // ✅ معدّل

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const address = await addAddress(user.id, parsed.data);
    return ok(address);
  } catch (err) {
    return fail(err as ApiError);
  }
}