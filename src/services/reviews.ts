import axios from "axios";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PageMeta {
  page: number;
  total: number;
  totalPages: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  authorName: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ViewerReviewState {
  canReview: boolean;
  hasReviewed: boolean;
  myReview: { rating: number; comment: string | null; status: ReviewStatus } | null;
}

export interface ProductReviewsData {
  items: PublicReview[];
  summary: ReviewSummary;
  viewer: ViewerReviewState | null;
  meta: PageMeta;
}

export async function fetchProductReviews(slug: string, page: number, limit = 10) {
  const res = await axios.get(`/api/products/${slug}/reviews`, { params: { page, limit } });
  return { ...res.data.data, meta: res.data.meta } as ProductReviewsData;
}

export async function createReview(input: { productId: string; rating: number; comment?: string }) {
  const res = await axios.post("/api/reviews", input);
  return res.data.data as { id: string; status: ReviewStatus };
}

// ===== الإدارة =====
export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { id: string; slug: string; nameAr: string; nameEn: string };
  user: { id: string; name: string; email: string };
}

export async function fetchAdminReviews(params: { status?: ReviewStatus; page: number; limit?: number }) {
  const res = await axios.get("/api/admin/reviews", { params });
  return { items: res.data.data as AdminReview[], meta: res.data.meta as PageMeta };
}

export async function moderateReview(id: string, status: "APPROVED" | "REJECTED") {
  const res = await axios.patch(`/api/admin/reviews/${id}`, { status });
  return res.data.data;
}

export async function deleteReview(id: string) {
  const res = await axios.delete(`/api/admin/reviews/${id}`);
  return res.data.data;
}