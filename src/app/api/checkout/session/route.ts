import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { createCheckoutSessionSchema } from "@/modules/checkout/checkout.validators";
import { createCheckout } from "@/modules/checkout/checkout.service";
import { checkoutRateLimit } from "@/lib/rate-limit";

// POST /api/checkout/session
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = await checkoutRateLimit.limit(ip);
    if (!success) {
      throw new ApiError("RATE_LIMITED", "عدد محاولات كبير جداً، حاول مرة أخرى بعد قليل", 429);
    }

    const session = await getServerSession(authOptions);
    const body = await req.json();

    const parsed = createCheckoutSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const result = await createCheckout(parsed.data, session?.user?.id);
    return ok(result);
  } catch (err) {
    return fail(err as ApiError);
  }
}