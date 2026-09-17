import { NextRequest } from "next/server";
import { ok, fail, validationError } from "@/lib/api-response";
import { listCategoriesQuerySchema } from "@/modules/categories/category.validators";
import { categoryService } from "@/modules/categories/category.service";

// GET /api/categories?q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listCategoriesQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const { items, meta } = await categoryService.list(parsed.data);
    return ok(items, meta);
  } catch (error) {
    return fail(error);
  }
}