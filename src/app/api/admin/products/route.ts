import { NextRequest } from "next/server";
import { ok, fail, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import {
  listProductsQuerySchema,
  createProductSchema,
} from "@/modules/products/product.validators";
import { productService } from "@/modules/products/product.service";

// GET /api/admin/products?status=&category=&q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listProductsQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const { data, meta } = await productService.list(parsed.data);
    return ok(data, meta);
  } catch (error) {
    return fail(error);
  }
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message ?? "معطيات غير صالحة");
    }

    const product = await productService.create(parsed.data);
    return ok(product, undefined, 201);
  } catch (error) {
    return fail(error);
  }
}