import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ملف الإعدادات الموجود مسبقًا في المشروع
import { ApiError } from "@/lib/api-response";

/**
 * يتحقق من وجود جلسة صالحة وأن دور المستخدم ADMIN (أو SUPER_ADMIN).
 * يُستخدم داخل كل Route Handler تحت /api/admin/* بالإضافة إلى middleware.ts
 * (لا نعتمد على الـ Middleware فقط - Defense in Depth).
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول أولاً", 401);
  }

  const role = (session.user as { role?: string }).role;

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new ApiError("FORBIDDEN", "لا تملك صلاحية الوصول لهذا المورد", 403);
  }

  return session;
}