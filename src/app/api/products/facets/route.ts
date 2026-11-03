// src/app/api/products/facets/route.ts
// يُستخدم لتعبئة قائمة الفئات ونطاق السعر في مكون ProductFilters بشكل ديناميكي
// حسب نتائج البحث/الفلاتر الحالية (بدون category/brand حتى لا تُقصي نفسها).

import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response"; // ✅ جديد
import { ApiError } from "@/lib/api-error"; // ✅ جديد
import { productQuerySchema } from "@/modules/products/product.validators";
import { getProductFilters } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  try {
    // ✅ معدّل: داخل try
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

    const parsed = productQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "معايير غير صحيحة", 400); // ✅ معدّل: نفس الرسالة الأصلية
    }

    const facets = await getProductFilters(parsed.data);
    return ok(facets); // ✅ معدّل: بدل NextResponse.json({ success: true, data: facets })
  } catch (err) {
    console.error("[GET /api/products/facets] error:", err); // أُبقي كما هو
    return fail(err as ApiError); // ✅ معدّل
  }
}