// src/app/api/products/facets/route.ts
// يُستخدم لتعبئة قائمة الفئات ونطاق السعر في مكون ProductFilters بشكل ديناميكي
// حسب نتائج البحث/الفلاتر الحالية (بدون category/brand حتى لا تُقصي نفسها).

import { NextRequest, NextResponse } from "next/server";
import { productQuerySchema } from "@/modules/products/product.validators";
import { getProductFilters } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const parsed = productQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "معايير غير صحيحة", statusCode: 400 },
      },
      { status: 400 }
    );
  }

  try {
    const facets = await getProductFilters(parsed.data);
    return NextResponse.json({ success: true, data: facets });
  } catch (err) {
    console.error("[GET /api/products/facets] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع", statusCode: 500 } },
      { status: 500 }
    );
  }
}