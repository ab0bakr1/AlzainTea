import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { moderateReviewSchema } from "@/modules/reviews/review.validators";
import { deleteReview, moderateReview } from "@/modules/reviews/review.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = moderateReviewSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await moderateReview(id, parsed.data));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await deleteReview(id));
  } catch (error) {
    return fail(error);
  }
}