import { ApiError } from "@/lib/api-error";
import { getShippingRate, ShippingRate } from "@/lib/shipping-rates";

export function calculateShipping(country: string): ShippingRate {
  const rate = getShippingRate(country);
  if (!rate) {
    throw new ApiError("SHIPPING_NOT_AVAILABLE", "الشحن غير متوفر لهذه الدولة حالياً", 400);
  }
  return rate;
}