// src/lib/api-error.ts
// معالجة أخطاء موحّدة لكل API routes - يوحّد شكل الخطأ ويمنع تسريب تفاصيل داخلية للعميل

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PAYMENT_FAILED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * يُستخدم داخل كل catch block في route handlers.
 * يسجّل تفاصيل الخطأ الكاملة في الخادم (لاحقاً: Sentry) ويرجع رسالة عامة آمنة للعميل.
 */
export function handleApiError(error: unknown) {
  // TODO: إرسال التفاصيل الكاملة إلى Sentry هنا
  console.error("[API_ERROR]", error);

  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", error.errors[0]?.message ?? "بيانات غير صالحة", 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return apiError("CONFLICT", "البيانات مستخدمة مسبقاً (بريد إلكتروني أو رقم جوال مكرر)", 409);
    }
    if (error.code === "P2025") {
      return apiError("NOT_FOUND", "العنصر المطلوب غير موجود", 404);
    }
  }

  return apiError("INTERNAL_ERROR", "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً", 500);
}