// src/app/api/admin/products/[id]/route.ts
// GET    /api/admin/products/[id]
// PATCH  /api/admin/products/[id]   (تعديل جزئي: أرسل الحقول المتغيّرة فقط)
// DELETE /api/admin/products/[id]   (حذف، أو أرشفة إن كان المنتج مرتبطاً بطلبات)

import { requireAdmin } from "@/lib/require-admin";
import { fail, ok, validationError } from "@/lib/api-response";
import { updateProductSchema } from "@/modules/products/product.validators";
import { productService } from "@/modules/products/product.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await productService.getById(id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => {
      throw validationError("صيغة JSON غير صالحة");
    });
    const input = updateProductSchema.parse(body);

    return ok(await productService.update(id, input));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await productService.remove(id));
  } catch (error) {
    return fail(error);
  }
}