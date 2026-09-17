import { NextResponse } from "next/server";

type Meta = Record<string, unknown>;

export function ok<T>(data: T, meta?: Meta, status = 200) {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status }
  );
}

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
        },
      },
      { status: error.statusCode }
    );
  }

  // خطأ Zod أو غير متوقع - لا نكشف تفاصيله للعميل
  console.error("[API_ERROR]", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "حدث خطأ غير متوقع، حاول مرة أخرى لاحقًا",
        statusCode: 500,
      },
    },
    { status: 500 }
  );
}

// أخطاء Zod تُحوَّل لصيغة موحّدة برمز 400
export function validationError(message: string) {
  return new ApiError("VALIDATION_ERROR", message, 400);
}