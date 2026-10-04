// src/app/api/auth/forgot-password/route.ts
import { after } from "next/server";
import { ApiError } from "@/lib/api-error";
import { fail, ok } from "@/lib/api-response";
import { passwordResetEmailRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/modules/auth/auth.validators";
import { requestPasswordReset } from "@/modules/auth/password-reset.service";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => {
      throw new ApiError("INVALID_JSON", "تعذّر قراءة جسم الطلب", 400);
    });
    const { email } = forgotPasswordSchema.parse(body);

    // العمل الفعلي في الخلفية: الرد موحّد وسريع سواء كان البريد مسجلاً أم لا
    after(async () => {
      try {
        // حد لكل بريد (3/ساعة) يمنع إغراق صندوق الضحية؛ التجاوز يُتجاهل بصمت دون كشف
        const rl = await passwordResetEmailRateLimit.limit(`email:${email}`);
        if (!rl.success) return;
        await requestPasswordReset(email);
      } catch (error) {
        console.error("[forgot-password] background task failed:", error);
      }
    });

    return ok({ sent: true });
  } catch (error) {
    return fail(error);
  }
}