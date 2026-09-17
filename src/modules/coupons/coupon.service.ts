import { ApiError } from "@/lib/api-error";
import { countUserCouponUsages, findActiveCouponByCode } from "./coupon.repository";
import { ValidateCouponInput } from "./coupon.validators";

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountAmount: number;
}

export async function validateCoupon(input: ValidateCouponInput): Promise<CouponValidationResult> {
  const coupon = await findActiveCouponByCode(input.code);

  if (!coupon) {
    throw new ApiError("COUPON_NOT_FOUND", "كود الكوبون غير صحيح أو غير مفعل", 422);
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new ApiError("COUPON_NOT_STARTED", "لم يبدأ سريان هذا الكوبون بعد", 422);
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new ApiError("COUPON_EXPIRED", "انتهت صلاحية هذا الكوبون", 422);
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError("COUPON_LIMIT_REACHED", "تم استنفاد عدد مرات استخدام هذا الكوبون", 422);
  }
  if (coupon.minOrderAmount && input.subtotal < Number(coupon.minOrderAmount)) {
    throw new ApiError(
      "COUPON_MIN_ORDER_NOT_MET",
      `الحد الأدنى للطلب لاستخدام هذا الكوبون هو ${coupon.minOrderAmount}`,
      422
    );
  }

  if (input.userId && coupon.usageLimitPerUser) {
    const userUsages = await countUserCouponUsages(coupon.id, input.userId);
    if (userUsages >= coupon.usageLimitPerUser) {
      throw new ApiError("COUPON_USER_LIMIT_REACHED", "لقد استخدمت هذا الكوبون من قبل", 422);
    }
  }

  let discountAmount =
    coupon.type === "PERCENTAGE" ? (input.subtotal * Number(coupon.value)) / 100 : Number(coupon.value);

  if (coupon.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  }
  discountAmount = Math.min(discountAmount, input.subtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { couponId: coupon.id, code: coupon.code, discountAmount };
}