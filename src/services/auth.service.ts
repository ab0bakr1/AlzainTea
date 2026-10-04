import axios from "axios";
import type { RegisterInput } from "@/modules/auth/auth.validators";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
}

export async function registerRequest(input: RegisterInput) {
  const { data } = await axios.post<{ success: true; data: RegisteredUser }>(
    "/api/auth/register",
    { name: input.name, email: input.email, password: input.password },
  );
  return data.data;
}

/** يرجع نجاحاً دائماً (رد موحّد من الخادم) سواء كان البريد مسجلاً أم لا */
export async function forgotPasswordRequest(email: string) {
  await axios.post("/api/auth/forgot-password", { email });
}

/** يرمي خطأ بالرمز INVALID_RESET_TOKEN إن كان الرابط غير صالح أو منتهياً */
export async function resetPasswordRequest(input: { token: string; password: string }) {
  await axios.post("/api/auth/reset-password", input);
}

export function parseApiError(error: unknown): { code?: string; status?: number } {
  if (axios.isAxiosError(error)) {
    return { code: error.response?.data?.error?.code, status: error.response?.status };
  }
  return {};
}