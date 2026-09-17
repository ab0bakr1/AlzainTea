// src/store/cart-store.ts
// المصدر الوحيد لحالة السلة في التطبيق. يُستخدم عبر hooks/useCart.ts فقط،
// ولا يُستدعى مباشرة من المكونات لضمان طبقة موحدة (راجع البند 6 في خطة البناء).

import { create } from "zustand";
import type { CartItem } from "@/types/cart";

// ملاحظة معمارية: لا نستخدم middleware الـ persist الجاهز من zustand هنا،
// لأنه يحفظ دائمًا تحت مفتاح ثابت واحد (name)، بينما نحتاج مفتاحًا مختلفًا
// لكل مستخدم (guest / userId) لدعم "دمج السلة" بشكل صحيح عند تسجيل الدخول.
// الحفظ الفعلي في localStorage يتم عبر lib/cart-merge.ts + hooks/useCartAuthSync.ts
// اللذين يشتركان في تغيّرات هذا الـ store ويكتبانها تحت المفتاح النشط (activeKey).

/** بادئة مفتاح التخزين المحلي. يُضاف لاحقة معرف المستخدم أو "guest". */
const STORAGE_KEY_PREFIX = "alzain-cart-storage";

export function cartStorageKey(userId?: string | null) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? "guest"}`;
}

interface CartState {
  items: CartItem[];
  /** المفتاح الحالي المستخدم للـ persist (يتغيّر عند تسجيل الدخول/الخروج) */
  activeKey: string;

  // Selectors محسوبة كدوال (وليست state) لتفادي إعادة الحساب غير الضرورية
  totalItems: () => number;
  totalPrice: () => number;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  /** تُستدعى من lib/cart-merge.ts فقط عند تغيّر جلسة المستخدم */
  switchStorageKey: (key: string) => void;
}

function sameLine(a: CartItem, productId: string, variantId?: string | null) {
  return a.productId === productId && (a.variantId ?? null) === (variantId ?? null);
}

export const useCartStore = create<CartState>()(
  (set, get) => ({
      items: [],
      activeKey: cartStorageKey(null),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.variantId));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.variantId)
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },

      removeItem: (productId, variantId = null) => {
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, variantId)),
        }));
      },

      updateQuantity: (productId, quantity, variantId = null) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, productId, variantId) ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setItems: (items) => set({ items }),

      switchStorageKey: (key) => set({ activeKey: key }),
    })
);