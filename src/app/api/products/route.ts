// src/app/api/products/route.ts
// أمثلة استدعاء:
//   /api/products?category=green-tea&sort=price_asc&page=2&limit=12
//   /api/products?q=سيلان&minPrice=5&maxPrice=50

import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response"; // ✅ جديد: بدل NextResponse
import { ApiError } from "@/lib/api-error"; // ✅ جديد
import { productQuerySchema } from "@/modules/products/product.validators";
import { listProducts } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  try {
    // ✅ معدّل: كل شيء داخل try ليغطيه fail()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

    const parsed = productQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      // ✅ معدّل: نفس الكود والرسالة والحالة، لكن عبر ApiError بدل JSON يدوي
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "معايير البحث غير صحيحة",
        400
      );
    }

    const { data, meta } = await listProducts(parsed.data);
    return ok(data, meta); // ✅ معدّل: بدل NextResponse.json({ success: true, data, meta })
  } catch (err) {
    console.error("[GET /api/products] error:", err); // أُبقي كما هو
    return fail(err as ApiError); // ✅ معدّل: بدل بناء الـ 500 يدوياً
  }
}