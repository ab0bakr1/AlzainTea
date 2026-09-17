// src/app/api/cart/validate/route.ts
// لا منطق أعمال هنا — فقط: تحقق من شكل المدخلات، استدعاء الـ Service، وتنسيق الرد.

import { NextRequest, NextResponse } from "next/server";
import { validateCartSchema } from "@/modules/cart/cart.validators";
import { validateCart } from "@/modules/cart/cart.service";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "صيغة الطلب غير صحيحة", statusCode: 400 } },
      { status: 400 }
    );
  }

  const parsed = validateCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "بيانات السلة غير صحيحة",
          statusCode: 400,
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await validateCart(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[cart/validate] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع", statusCode: 500 } },
      { status: 500 }
    );
  }
}