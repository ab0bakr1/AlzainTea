// src/app/api/admin/products/route.ts
// GET  /api/admin/products?page=&limit=&q=&status=&category=&stock=low|out&sort=
// POST /api/admin/products

import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { fail, ok, validationError } from "@/lib/api-response";
import {
  adminProductsQuerySchema,
  createProductSchema,
} from "@/modules/products/product.validators";
import { productService } from "@/modules/products/product.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // نتجاهل المعاملات الفارغة (?q=&status=) بدل رفضها
    const raw = Object.fromEntries(
      Array.from(req.nextUrl.searchParams.entries()).filter(([, value]) => value.trim() !== ""),
    );
    const query = adminProductsQuerySchema.parse(raw);

    const result = await productService.adminList(query);
    return ok(result.data, result.meta);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => {
      throw validationError("صيغة JSON غير صالحة");
    });
    const input = createProductSchema.parse(body);

    const product = await productService.create(input);
    return ok(product, undefined, 201);
  } catch (error) {
    return fail(error);
  }
}