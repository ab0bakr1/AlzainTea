import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fail, ok, validationError } from "@/lib/api-response";
import { listReviewsQuerySchema } from "@/modules/reviews/review.validators";
import { getProductReviews } from "@/modules/reviews/review.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const parsed = listReviewsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) return validationError(parsed.error.message);

    // الجلسة اختيارية: تُستخدم فقط لمعرفة هل يحق للمستخدم كتابة مراجعة
    const session = await getServerSession(authOptions);
    const result = await getProductReviews(slug, parsed.data, session?.user?.id);
    return ok(result.data, result.meta);
  } catch (error) {
    return fail(error);
  }
}