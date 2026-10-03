import { NextResponse } from "next/server";
import { registerSchema } from "@/modules/auth/auth.validators";
import { registerUser, EmailAlreadyUsedError } from "@/modules/auth/auth.service";
import { fail } from "@/lib/api-response";

const errorBody = (code: string, message: string, statusCode: number) =>
  NextResponse.json({ success: false, error: { code, message, statusCode } }, { status: statusCode });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorBody("INVALID_JSON", "تعذّر قراءة جسم الطلب", 400);
  }

  try {
    const input = registerSchema.parse(body); // ZodError → 400 VALIDATION_ERROR عبر fail()
    const user = await registerUser(input);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyUsedError) {
      return errorBody("EMAIL_TAKEN", "هذا البريد الإلكتروني مسجَّل بالفعل", 409);
    }
    return fail(error);
  }
}