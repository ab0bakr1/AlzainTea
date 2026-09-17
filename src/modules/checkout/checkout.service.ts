import { ApiError } from "@/lib/api-error";
import { toSmallestUnit } from "@/lib/currency";
import { validateCart } from "@/modules/cart/cart.service";
import { calculateShipping } from "@/modules/shipping/shipping.service";
import { validateCoupon } from "@/modules/coupons/coupon.service";
import { assertAddressOwnership } from "@/modules/addresses/address.service";
import { createOrderWithStockReservation } from "./checkout.repository";
import { CreateCheckoutSessionInput } from "./checkout.validators";
import { createPaymentSession } from "@/modules/payments/payment.service";

// نسب ضريبة القيمة المضافة الأساسية حسب الدولة.
// TODO: نقلها لاحقاً إلى إعدادات قابلة للتعديل من لوحة تحكم الإدارة بدل تثبيتها في الكود.
const VAT_RATES: Record<string, number> = {
  SA: 0.15,
  AE: 0.05,
  OM: 0.05,
  BH: 0.1,
  QA: 0,
  KW: 0,
  US: 0,
  GB: 0.2,
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createCheckout(input: CreateCheckoutSessionInput, userId?: string) {
  // 1) مصدر الحقيقة الوحيد للسعر والمخزون: التحقق الخادمي من السلة (لا نثق بأي سعر قادم من الواجهة)
  const validatedCart = await validateCart(input.items);
  if (validatedCart.hasBlockingIssues) {
    throw new ApiError("CART_INVALID", "بعض عناصر السلة غير متوفرة أو تغيرت أسعارها، يرجى تحديث السلة", 409);
  }

  const subtotal = round2(
    validatedCart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  // 2) الشحن — هذا الأسبوع مفعّل فقط للدول الموجهة إلى Stripe (US, GB).
  // بوابة الخليج المحلية (Tap/Moyasar) تُستكمل الأسبوع القادم حسب خارطة الطريق.
  const shippingRate = calculateShipping(input.country);
  if (shippingRate.gateway !== "stripe") {
    throw new ApiError(
      "GATEWAY_NOT_READY",
      "الدفع لهذه الدولة عبر البوابة الخليجية المحلية غير مفعّل بعد، سيتم إطلاقه قريباً",
      400
    );
  }

  // 3) الكوبون (اختياري)
  let discount = 0;
  let couponId: string | undefined;
  if (input.couponCode) {
    const couponResult = await validateCoupon({ code: input.couponCode, subtotal, userId });
    discount = couponResult.discountAmount;
    couponId = couponResult.couponId;
  }

  // 4) عنوان الشحن: عنوان محفوظ لمستخدم مسجل، أو بيانات زائر
  let shippingAddressId: string | undefined;
  if (input.addressId) {
    if (!userId) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول لاستخدام عنوان محفوظ", 401);
    const address = await assertAddressOwnership(userId, input.addressId);
    shippingAddressId = address.id;
  } else if (!input.guestAddress || !input.guestEmail) {
    throw new ApiError("VALIDATION_ERROR", "بيانات عنوان الزائر أو البريد الإلكتروني ناقصة", 400);
  }

  // 5) الضريبة تُحسب على (المجموع الفرعي - الخصم)، قبل إضافة الشحن
  const vatRate = VAT_RATES[input.country] ?? 0;
  const tax = round2((subtotal - discount) * vatRate);
  const total = round2(subtotal - discount + shippingRate.cost + tax);

  // 6) إنشاء الطلب (PENDING/UNPAID) مع حجز المخزون داخل Transaction واحدة
  const order = await createOrderWithStockReservation({
    userId,
    guestEmail: userId ? undefined : input.guestEmail,
    country: input.country,
    // ملاحظة MVP: يُخزَّن الطلب ويُحاسب عبر Stripe بالدولار الأمريكي حالياً.
    // التحويل الكامل لعملة الدولة عند الدفع سيُضاف عند تفعيل بوابة الخليج المحلية.
    currency: "USD",
    subtotal,
    discount,
    shippingCost: shippingRate.cost,
    tax,
    total,
    vatNumber: input.vatNumber,
    couponId,
    shippingAddressId,
    items: validatedCart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
    })),
  });

  // 7) إنشاء جلسة الدفع عبر Stripe
  const paymentSession = await createPaymentSession("stripe", {
    orderId: order.id,
    amountInCents: toSmallestUnit(total, "USD"),
    currency: "usd",
    customerEmail: input.guestEmail,
  });

  return { orderId: order.id, checkoutUrl: paymentSession.url };
}