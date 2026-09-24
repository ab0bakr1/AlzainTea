import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireUser } from "@/lib/require-user";
import {
  wishlistListQuerySchema,
  wishlistProductSchema,
} from "@/modules/wishlist/wishlist.validators";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "@/modules/wishlist/wishlist.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = wishlistListQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) return validationError(parsed.error.message);

    const result = await getWishlist(user.id, parsed.data);
    return ok(result.data, result.meta);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = wishlistProductSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await addToWishlist(user.id, parsed.data.productId));
  } catch (error) {
    return fail(error);
  }
}

/** DELETE /api/wishlist?productId=xxx */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = wishlistProductSchema.safeParse({
      productId: req.nextUrl.searchParams.get("productId") ?? "",
    });
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await removeFromWishlist(user.id, parsed.data.productId));
  } catch (error) {
    return fail(error);
  }
}