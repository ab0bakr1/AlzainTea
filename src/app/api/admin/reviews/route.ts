import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { adminListReviewsQuerySchema } from "@/modules/reviews/review.validators";
import { adminListReviews } from "@/modules/reviews/review.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = adminListReviewsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) return validationError(parsed.error.message);

    const result = await adminListReviews(parsed.data);
    return ok(result.data, result.meta);
  } catch (error) {
    return fail(error);
  }
}