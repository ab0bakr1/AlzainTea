import { ok, fail } from "@/lib/api-response";
import { productService } from "@/modules/products/product.service";

// GET /api/products/[slug]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await productService.getBySlug(slug, { publicOnly: true });
    return ok(product);
  } catch (error) {
    return fail(error);
  }
}