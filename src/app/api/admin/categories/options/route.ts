import { ok, fail } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { categoryService } from "@/modules/categories/category.service";

// GET /api/admin/categories/options
// قائمة مسطحة خفيفة (id, الاسمان, slug, parentId) لقوائم الاختيار — بدون ترقيم
export async function GET() {
  try {
    await requireAdmin();
    const options = await categoryService.listAllForSelect();
    return ok(options);
  } catch (error) {
    return fail(error);
  }
}