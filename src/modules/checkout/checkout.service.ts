import { ApiError } from "@/lib/api-error";
import { toSmallestUnit } from "@/lib/currency";
import { currencyForCountry, convertUsdToLocal, toMinorUnits, roundForCurrency } from "@/lib/gcc-currency";
import { validateCart } from "@/modules/cart/cart.service";
import { calculateShipping } from "@/modules/shipping/shipping.service";
import { validateCoupon } from "@/modules/coupons/coupon.service";
import { assertAddressOwnership } from "@/modules/addresses/address.service";
import { createOrderWithStockReservation } from "./checkout.repository";
import { CreateCheckoutSessionInput } from "./checkout.validators";
import { createPaymentSession, resolveGateway } from "@/modules/payments/payment.service";

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

  // كل الحسابات الوسيطة (subtotal/discount/tax) تُحسب أولاً بالدولار لأنه عملة
  // تسعير المنتجات الأساسية في قاعدة البيانات (Product.price)، ثم تُحوَّل بالكامل
  // للعملة النهائية للطلب في الخطوة 6 بدل تحويل "الإجمالي" مباشرة كرقم واحد،
  // لتفادي أخطاء التقريب المتراكمة.
  const subtotalUsd = round2(
    validatedCart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  // 2) الشحن
  const shippingRate = calculateShipping(input.country);

  // 3) بوابة الدفع: خليجية (Tap أو Moyasar حسب PAYMENT_PROVIDER في .env) لدول الخليج،
  // أو Stripe لبقية الدول. لم يعد هناك أي قيد على دول الخليج بعد تفعيل هذه المرحلة.
  const gateway = resolveGateway(input.country);
  const orderCurrency = gateway === "stripe" ? "USD" : currencyForCountry(input.country);
  if (!orderCurrency) {
    // احتياطي دفاعي فقط: لا يجب أن يحدث طالما resolveGateway وcurrencyForCountry
    // متوافقتان على نفس قائمة دول الخليج المدعومة.
    throw new ApiError("VALIDATION_ERROR", "تعذر تحديد عملة الدفع لهذه الدولة", 400);
  }

  const toOrderCurrency = (amountUsd: number) =>
    orderCurrency === "USD" ? amountUsd : convertUsdToLocal(amountUsd, orderCurrency);

  // 4) الكوبون (اختياري) — يُحسب على أساس السعر بالدولار (مصدر الحقيقة في قاعدة البيانات)
  let discountUsd = 0;
  let couponId: string | undefined;
  if (input.couponCode) {
    const couponResult = await validateCoupon({ code: input.couponCode, subtotal: subtotalUsd, userId });
    discountUsd = couponResult.discountAmount;
    couponId = couponResult.couponId;
  }

  // 5) عنوان الشحن: عنوان محفوظ لمستخدم مسجل، أو بيانات زائر
  let shippingAddressId: string | undefined;
  if (input.addressId) {
    if (!userId) throw new ApiError("UNAUTHORIZED", "يجب تسجيل الدخول لاستخدام عنوان محفوظ", 401);
    const address = await assertAddressOwnership(userId, input.addressId);
    shippingAddressId = address.id;
  } else if (!input.guestAddress || !input.guestEmail) {
    throw new ApiError("VALIDATION_ERROR", "بيانات عنوان الزائر أو البريد الإلكتروني ناقصة", 400);
  }

  // 6) تحويل كل الأرقام لعملة الطلب الفعلية، ثم إعادة حساب الضريبة والإجمالي فيها
  const subtotal = toOrderCurrency(subtotalUsd);
  const discount = toOrderCurrency(discountUsd);
  const shippingCost = toOrderCurrency(shippingRate.cost);
  const vatRate = VAT_RATES[input.country] ?? 0;
  const tax = roundForCurrency((subtotal - discount) * vatRate, orderCurrency);
  const total = roundForCurrency(subtotal - discount + shippingCost + tax, orderCurrency);

  // 7) إنشاء الطلب (PENDING/UNPAID) مع حجز المخزون داخل Transaction واحدة
  const order = await createOrderWithStockReservation({
    userId,
    guestEmail: userId ? undefined : input.guestEmail,
    country: input.country,
    currency: orderCurrency,
    paymentMethod: gateway,
    subtotal,
    discount,
    shippingCost,
    tax,
    total,
    vatNumber: input.vatNumber,
    couponId,
    shippingAddressId,
    items: validatedCart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: toOrderCurrency(item.price),
    })),
  });

  // 8) إنشاء جلسة الدفع عبر المزوّد المناسب (Stripe أو البوابة الخليجية المحلية)
  const paymentSession = await createPaymentSession(gateway, {
    orderId: order.id,
    amountInCents:
      gateway === "stripe" ? toSmallestUnit(total, "USD") : toMinorUnits(total, orderCurrency),
    currency: gateway === "stripe" ? "usd" : orderCurrency,
    customerEmail: input.guestEmail,
  });

  return { orderId: order.id, checkoutUrl: paymentSession.url };
}