import axios from "axios";

export function getErrorMessage(error: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}