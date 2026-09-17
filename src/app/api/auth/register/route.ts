import { NextResponse } from "next/server";
import { registerSchema } from "@/modules/auth/auth.validators";
import { registerUser, EmailAlreadyUsedError } from "@/modules/auth/auth.service";

// تنسيق استجابة موحد (نجاح/خطأ) كما هو معرّف في خطة المشروع (البند 14)
function errorResponse(code: string, message: string, statusCode: number) {
  return NextResponse.json(
    { success: false, error: { code, message, statusCode } },
    { status: statusCode },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "تعذّر قراءة جسم الطلب", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      400,
    );
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyUsedError) {
      return errorResponse("EMAIL_ALREADY_USED", "هذا البريد الإلكتروني مسجَّل بالفعل", 409);
    }
    console.error("[auth/register]", err);
    return errorResponse("SERVER_ERROR", "حدث خطأ غير متوقع، حاول لاحقًا", 500);
  }
}