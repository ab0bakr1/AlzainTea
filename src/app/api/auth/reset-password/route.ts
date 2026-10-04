// src/app/api/auth/reset-password/route.ts
import { after } from "next/server";
import { ApiError } from "@/lib/api-error";
import { fail, ok } from "@/lib/api-response";
import { resetPasswordSchema } from "@/modules/auth/auth.validators";
import { resetPassword, sendPasswordChangedNotice } from "@/modules/auth/password-reset.service";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => {
      throw new ApiError("INVALID_JSON", "تعذّر قراءة جسم الطلب", 400);
    });
    const { token, password } = resetPasswordSchema.parse(body);

    const user = await resetPassword(token, password);
    after(() => sendPasswordChangedNotice(user));

    return ok({ reset: true });
  } catch (error) {
    return fail(error);
  }
}