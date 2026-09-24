import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api-error";

// إعادة تصدير للتوافق مع الملفات التي تستورد من هنا
export { ApiError };

type Meta = Record<string, unknown>;

export function ok<T>(data: T, meta?: Meta, status = 200) {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status }
  );
}

// fail الآن تفوّض لـ handleApiError (يعالج ApiError و Zod و Prisma)
export function fail(error: unknown) {
  return handleApiError(error);
}

export function validationError(message: string) {
  return new ApiError("VALIDATION_ERROR", message, 400);
}