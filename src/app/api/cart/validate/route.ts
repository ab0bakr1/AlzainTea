// src/app/api/cart/validate/route.ts
// لا منطق أعمال هنا — فقط: تحقق من شكل المدخلات، استدعاء الـ Service، وتنسيق الرد.

import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { validateCartSchema } from "@/modules/cart/cart.validators";
import { validateCart } from "@/modules/cart/cart.service";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError("INVALID_JSON", "صيغة الطلب غير صحيحة", 400);
    }

    const parsed = validateCartSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "بيانات السلة غير صحيحة",
        400
      );
    }

    const result = await validateCart(parsed.data);
    return ok(result);
  } catch (err) {
    return fail(err as ApiError);
  }
}