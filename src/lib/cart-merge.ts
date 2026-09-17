// src/lib/cart-merge.ts
// لا يوجد جدول Cart في قاعدة البيانات (راجع CLAUDE.md) — السلة تعيش بالكامل في
// localStorage. لذلك "الدمج" هنا يعني: دمج سلة الزائر (guest) مع أي سلة سابقة
// محفوظة لهذا المستخدم على نفس الجهاز/المتصفح، وليس دمجًا مع سجل في الخادم.

import type { CartItem } from "@/types/cart";
import { cartStorageKey, useCartStore } from "@/store/cart-store";

/** يقرأ عناصر سلة من مفتاح تخزين معيّن (بصيغة zustand persist) */
export function readCartFromKey(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (parsed?.state?.items as CartItem[]) ?? [];
  } catch {
    // بيانات تالفة في التخزين المحلي — نتجاهلها بأمان بدل تعطيل الصفحة
    return [];
  }
}

/** يكتب عناصر سلة إلى مفتاح تخزين معيّن بنفس صيغة zustand persist */
export function writeCartToKey(key: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    key,
    JSON.stringify({ state: { items, activeKey: key }, version: 0 })
  );
}

function lineKey(i: CartItem) {
  return `${i.productId}::${i.variantId ?? ""}`;
}

/**
 * يدمج سلتين: عند تطابق نفس المنتج/المتغير تُجمع الكميات،
 * ويُعتمد أحدث سعر معروف (guest غالبًا أحدث لأنه آخر ما تصفحه العميل).
 */
export function mergeCartItems(guestItems: CartItem[], userItems: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();

  for (const item of userItems) {
    map.set(lineKey(item), { ...item });
  }

  for (const item of guestItems) {
    const key = lineKey(item);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        price: item.price, // اعتماد آخر سعر شوهد
        quantity: existing.quantity + item.quantity,
      });
    } else {
      map.set(key, { ...item });
    }
  }

  return Array.from(map.values());
}

/**
 * يُستدعى مرة واحدة عند تحوّل حالة الجلسة من "زائر" إلى "مسجّل دخول".
 * - يقرأ سلة الزائر الحالية من الـ store (في الذاكرة).
 * - يقرأ أي سلة سابقة محفوظة لهذا المستخدم على هذا الجهاز.
 * - يدمجهما، يحفظ تحت مفتاح المستخدم، ويصفّر مفتاح الزائر.
 */
export function mergeGuestCartIntoUser(userId: string) {
  const guestKey = cartStorageKey(null);
  const userKey = cartStorageKey(userId);

  const guestItems = useCartStore.getState().items; // ما هو معروض حاليًا للزائر
  const previousUserItems = readCartFromKey(userKey);

  const merged = mergeCartItems(guestItems, previousUserItems);

  writeCartToKey(userKey, merged);
  writeCartToKey(guestKey, []); // إفراغ سلة الزائر بعد الدمج لتفادي التكرار عند تسجيل الخروج لاحقًا

  useCartStore.setState({ items: merged, activeKey: userKey });
}

/** يُستدعى عند تسجيل الخروج للعودة إلى سلة زائر فارغة أو محفوظة سابقًا */
export function switchToGuestCart() {
  const guestKey = cartStorageKey(null);
  const guestItems = readCartFromKey(guestKey);
  useCartStore.setState({ items: guestItems, activeKey: guestKey });
}