import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";

/**
 * يتحقق من وجود جلسة مستخدم مسجل ويعيد هويته.
 * يرمي ApiError 401 عند عدم وجود جلسة.
 */
export async function requireUser(): Promise<{ id: string; role: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول أولاً", 401);
  }
  return { id: session.user.id, role: session.user.role };
}