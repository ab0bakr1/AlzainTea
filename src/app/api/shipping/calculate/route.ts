import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { calculateShippingSchema } from "@/modules/shipping/shipping.validators";
import { calculateShipping } from "@/modules/shipping/shipping.service";

// GET /api/shipping/calculate?country=SA
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") ?? "";
    const parsed = calculateShippingSchema.safeParse({ country });
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        400
      );
    }

    const rate = calculateShipping(parsed.data.country);

    return ok({
      country: rate.country,
      cost: rate.cost,
      currency: rate.currency,
      gateway: rate.gateway,
      estimatedDays: { min: rate.minDays, max: rate.maxDays },
    });
  } catch (err) {
    return fail(err as ApiError);
  }
}