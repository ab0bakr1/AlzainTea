// src/modules/cart/cart.service.ts
// السعر والمخزون هنا هما "مصدر الحقيقة" الوحيد — لا يُعتمد إطلاقًا على أي
// سعر/كمية قادمة من الواجهة (راجع Security Checklist في خطة البناء، البند 10).

import { prisma } from "@/lib/prisma";
import type { ValidateCartInput } from "./cart.validators";
import type { CartItem, CartValidationIssue, CartValidationResult } from "@/types/cart";

export async function validateCart(input: ValidateCartInput): Promise<CartValidationResult> {
  const issues: CartValidationIssue[] = [];
  const resultItems: CartItem[] = [];

  // جلب كل المنتجات المطلوبة دفعة واحدة لتفادي مشكلة N+1
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of input.items) {
    const product = productMap.get(line.productId);

    if (!product || product.status !== "ACTIVE") {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        type: "PRODUCT_UNAVAILABLE",
        message: `المنتج "${product?.nameAr ?? line.productId}" لم يعد متوفرًا للبيع`,
      });
      continue; // لا يُضاف للسلة الناتجة
    }

    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId)
      : undefined;

    if (line.variantId && !variant) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        type: "PRODUCT_UNAVAILABLE",
        message: `الخيار المحدد من "${product.nameAr}" لم يعد متوفرًا`,
      });
      continue;
    }

    const authoritativePrice = Number(variant?.price ?? product.price);
    const availableStock = variant
      ? variant.stock
      : product.stock - product.reservedStock;

    let finalQuantity = line.quantity;

    if (availableStock <= 0) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        type: "OUT_OF_STOCK",
        message: `"${product.nameAr}" نفدت كميته حاليًا`,
      });
      continue;
    }

    if (line.quantity > availableStock) {
      issues.push({
        productId: line.productId,
        variantId: line.variantId,
        type: "QUANTITY_CAPPED",
        message: `الكمية المتاحة من "${product.nameAr}" هي ${availableStock} فقط`,
        newValue: availableStock,
      });
      finalQuantity = availableStock;
    }

    resultItems.push({
      productId: product.id,
      variantId: line.variantId ?? null,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      slug: product.slug,
      image: product.images[0] ?? null,
      price: authoritativePrice,
      quantity: finalQuantity,
      knownStock: availableStock,
    });
  }

  const subtotal = resultItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    valid: issues.length === 0,
    issues,
    items: resultItems,
    subtotal,
  };
}