import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { adminReviewStats } from "@/modules/reviews/review.service";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await adminReviewStats());
  } catch (error) {
    return fail(error);
  }
}