import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { ApiError, handleApiError } from "@/lib/api-error";

export { ApiError };

type Meta = Record<string, unknown>;

export function ok<T>(data: T, meta?: Meta, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status }
  );
}

export function fail(error: unknown): NextResponse {
  return handleApiError(error);
}

export function validationError(input: string | ZodError): NextResponse {
  const message =
    typeof input === "string"
      ? input
      : input.issues[0]?.message ?? "بيانات غير صالحة";
  return handleApiError(new ApiError("VALIDATION_ERROR", message, 400));
}