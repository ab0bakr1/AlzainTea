import { ok, fail } from "@/lib/api-response";
import { categoryService } from "@/modules/categories/category.service";

// GET /api/categories/[slug]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const category = await categoryService.getBySlug(slug);
    return ok(category);
  } catch (error) {
    return fail(error);
  }
}