// src/hooks/useCart.ts
// نقطة الدخول الوحيدة الموصى بها للتعامل مع السلة من داخل المكونات.
// لا تستورد useCartStore مباشرة في المكونات — مر دائمًا عبر هذا الـ hook.

"use client";

import { useCallback, useState } from "react";
import { useCartStore } from "@/store/cart-store";
import type { CartItem, CartValidationResult } from "@/types/cart";

export function useCart() {
  const items = useCartStore((s) => s.items);
  const addItemToStore = useCartStore((s) => s.addItem);
  const removeItemFromStore = useCartStore((s) => s.removeItem);
  const updateQuantityInStore = useCartStore((s) => s.updateQuantity);
  const clearCartInStore = useCartStore((s) => s.clearCart);
  const setItems = useCartStore((s) => s.setItems);

  const [isValidating, setIsValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<CartValidationResult["issues"]>([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      addItemToStore(item, quantity);
    },
    [addItemToStore]
  );

  const removeItem = useCallback(
    (productId: string, variantId?: string | null) => removeItemFromStore(productId, variantId),
    [removeItemFromStore]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string | null) =>
      updateQuantityInStore(productId, quantity, variantId),
    [updateQuantityInStore]
  );

  const clearCart = useCallback(() => clearCartInStore(), [clearCartInStore]);

  /**
   * يستدعي /api/cart/validate قبل الانتقال إلى صفحة الدفع.
   * يُحدّث السلة تلقائيًا (كميات/أسعار) إن اختلفت عن الواقع، ويرجع قائمة المشاكل للعرض للعميل.
   */
  const validateCart = useCallback(async (): Promise<CartValidationResult> => {
    setIsValidating(true);
    try {
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? undefined,
            quantity: i.quantity,
          })),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "تعذّر التحقق من السلة");
      }

      const result = json.data as CartValidationResult;
      setValidationIssues(result.issues);
      setItems(result.items); // تحديث السلة تلقائيًا بالكميات/الأسعار الصحيحة
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [items, setItems]);

  return {
    items,
    totalItems,
    subtotal,
    isValidating,
    validationIssues,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    validateCart,
  };
}