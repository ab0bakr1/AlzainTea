import { ok, fail, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { updateCategorySchema } from "@/modules/categories/category.validators";
import { categoryService } from "@/modules/categories/category.service";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/categories/[id]
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const category = await categoryService.getById(id);
    return ok(category);
  } catch (error) {
    return fail(error);
  }
}

// PATCH /api/admin/categories/[id]
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const category = await categoryService.update(id, parsed.data);
    return ok(category);
  } catch (error) {
    return fail(error);
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await requireAdmin();
    await categoryService.remove(id);
    return ok({ id, deleted: true });
  } catch (error) {
    return fail(error);
  }
}