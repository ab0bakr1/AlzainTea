import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { bulkReviewsSchema } from "@/modules/reviews/review.validators";
import { bulkReviews } from "@/modules/reviews/review.service";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    // json فاسد => null => يفشل التحقق بـ 400 بدل 500
    const body = await req.json().catch(() => null);
    const parsed = bulkReviewsSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await bulkReviews(parsed.data));
  } catch (error) {
    return fail(error);
  }
}