import { ok, fail, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { updateProductSchema } from "@/modules/products/product.validators";
import { productService } from "@/modules/products/product.service";

// GET /api/admin/products/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const product = await productService.getById(id);
    return ok(product);
  } catch (error) {
    return fail(error);
  }
}

// PATCH /api/admin/products/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const product = await productService.update(id, parsed.data);
    return ok(product);
  } catch (error) {
    return fail(error);
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await productService.remove(id);
    return ok({ id, deleted: true });
  } catch (error) {
    return fail(error);
  }
}