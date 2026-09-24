import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireUser } from "@/lib/require-user";
import { createReviewSchema } from "@/modules/reviews/review.validators";
import { createReview } from "@/modules/reviews/review.service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = createReviewSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error.message);

    const review = await createReview(user.id, parsed.data);
    return ok(review);
  } catch (error) {
    return fail(error);
  }
}