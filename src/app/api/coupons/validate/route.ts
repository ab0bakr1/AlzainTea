import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { validateCouponSchema } from "@/modules/coupons/coupon.validators";
import { validateCoupon } from "@/modules/coupons/coupon.service";

// POST /api/coupons/validate  { code, subtotal }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const parsed = validateCouponSchema.safeParse({ ...body, userId: session?.user?.id });
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const result = await validateCoupon(parsed.data);
    return ok(result);
  } catch (err) {
    return fail(err as ApiError);
  }
}