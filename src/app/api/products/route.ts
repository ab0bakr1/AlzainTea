// src/app/api/products/route.ts
// أمثلة استدعاء:
//   /api/products?category=green-tea&sort=price_asc&page=2&limit=12
//   /api/products?q=سيلان&minPrice=5&maxPrice=50

import { NextRequest, NextResponse } from "next/server";
import { productQuerySchema } from "@/modules/products/product.validators";
import { listProducts } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const parsed = productQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "معايير البحث غير صحيحة",
          statusCode: 400,
        },
      },
      { status: 400 }
    );
  }

  try {
    const { data, meta } = await listProducts(parsed.data);
    return NextResponse.json({ success: true, data, meta });
  } catch (err) {
    console.error("[GET /api/products] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع", statusCode: 500 } },
      { status: 500 }
    );
  }
}