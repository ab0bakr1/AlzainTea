import { NextRequest } from "next/server";
import { ok, fail, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import {
  listCategoriesQuerySchema,
  createCategorySchema,
} from "@/modules/categories/category.validators";
import { categoryService } from "@/modules/categories/category.service";

// GET /api/admin/categories?q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

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

// POST /api/admin/categories
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const category = await categoryService.create(parsed.data);
    return ok(category, undefined, 201);
  } catch (error) {
    return fail(error);
  }
}