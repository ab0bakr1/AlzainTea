import { ApiError } from "@/lib/api-error";
import * as repo from "./review.repository";
import type {
  AdminListReviewsQuery,
  CreateReviewInput,
  ListReviewsQuery,
  ModerateReviewInput,
} from "./review.validators";

/** true = لا يُسمح بالمراجعة إلا لمن استلم المنتج فعلاً */
const REQUIRE_VERIFIED_PURCHASE = true;

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${Array.from(parts[1])[0]}.`;
}

function buildSummary(rows: { rating: number; count: number }[]) {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5] = r.count;
      count += r.count;
      sum += r.rating * r.count;
    }
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
}

async function getViewerState(userId: string, productId: string) {
  const existing = await repo.findUserReview(userId, productId);
  if (existing) {
    return {
      canReview: false,
      hasReviewed: true,
      myReview: { rating: existing.rating, comment: existing.comment, status: existing.status },
    };
  }
  const purchased = REQUIRE_VERIFIED_PURCHASE
    ? await repo.hasDeliveredPurchase(userId, productId)
    : true;
  return { canReview: purchased, hasReviewed: false, myReview: null };
}

export async function getProductReviews(slug: string, query: ListReviewsQuery, viewerId?: string) {
  const product = await repo.findProductBySlug(slug);
  if (!product) throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);

  const skip = (query.page - 1) * query.limit;
  const [{ items, total }, distribution, viewer] = await Promise.all([
    repo.listApproved(product.id, skip, query.limit),
    repo.ratingDistribution(product.id),
    viewerId ? getViewerState(viewerId, product.id) : Promise.resolve(null),
  ]);

  return {
    data: {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
        authorName: maskName(r.user.name),
      })),
      summary: buildSummary(distribution),
      viewer,
    },
    meta: { page: query.page, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function createReview(userId: string, input: CreateReviewInput) {
  const product = await repo.findProductById(input.productId);
  if (!product || product.status !== "ACTIVE") {
    throw new ApiError("PRODUCT_NOT_FOUND", "المنتج غير موجود", 404);
  }

  if (await repo.findUserReview(userId, input.productId)) {
    throw new ApiError("REVIEW_ALREADY_EXISTS", "لقد قمت بتقييم هذا المنتج مسبقاً", 409);
  }

  if (REQUIRE_VERIFIED_PURCHASE && !(await repo.hasDeliveredPurchase(userId, input.productId))) {
    throw new ApiError("PURCHASE_REQUIRED", "يمكنك تقييم المنتجات التي استلمتها فقط", 403);
  }

  try {
    return await repo.createReview({
      productId: input.productId,
      userId,
      rating: input.rating,
      comment: input.comment || undefined,
      verifiedPurchase: true,
    });
  } catch (error) {
    // سباق تزامني: قيد (productId, userId) الفريد
    if ((error as { code?: string }).code === "P2002") {
      throw new ApiError("REVIEW_ALREADY_EXISTS", "لقد قمت بتقييم هذا المنتج مسبقاً", 409);
    }
    throw error;
  }
}

// ===== الإدارة =====
export async function adminListReviews(query: AdminListReviewsQuery) {
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await repo.adminList(query.status, skip, query.limit);
  return {
    data: items,
    meta: { page: query.page, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function moderateReview(id: string, input: ModerateReviewInput) {
  if (!(await repo.findById(id))) {
    throw new ApiError("REVIEW_NOT_FOUND", "المراجعة غير موجودة", 404);
  }
  return repo.updateStatus(id, input.status);
}

export async function deleteReview(id: string) {
  if (!(await repo.findById(id))) {
    throw new ApiError("REVIEW_NOT_FOUND", "المراجعة غير موجودة", 404);
  }
  await repo.deleteById(id);
  return { id, deleted: true };
}