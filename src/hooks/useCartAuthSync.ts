// src/hooks/useCartAuthSync.ts
// يُستخدم مرة واحدة داخل AppProviders (src/providers/AppProviders.tsx) لضمان
// أن السلة تُدمج تلقائيًا فور تغيّر حالة جلسة next-auth (تسجيل دخول/خروج).

"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore, cartStorageKey } from "@/store/cart-store";
import { mergeGuestCartIntoUser, switchToGuestCart, readCartFromKey } from "@/lib/cart-merge";

export function useCartAuthSync() {
  const { data: session, status } = useSession();
  const previousUserId = useRef<string | null | undefined>(undefined);

  // كتابة أي تغيّر على السلة إلى localStorage تحت المفتاح النشط حاليًا (guest أو userId)
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe((state) => {
      writeCartToKey(state.activeKey, state.items);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status === "loading") return; // لا نتصرف قبل معرفة حالة الجلسة الفعلية

    const currentUserId = session?.user?.id ?? null;

    // أول تشغيل بعد معرفة الحالة: حمّل السلة المناسبة فقط، بدون دمج
    if (previousUserId.current === undefined) {
      if (currentUserId) {
        const key = cartStorageKey(currentUserId);
        useCartStore.setState({ items: readCartFromKey(key), activeKey: key });
      } else {
        switchToGuestCart();
      }
      previousUserId.current = currentUserId;
      return;
    }

    // انتقال من زائر → مسجّل دخول: ادمج السلتين
    if (!previousUserId.current && currentUserId) {
      mergeGuestCartIntoUser(currentUserId);
    }

    // انتقال من مسجّل دخول → تسجيل خروج: ارجع لسلة الزائر
    if (previousUserId.current && !currentUserId) {
      switchToGuestCart();
    }

    previousUserId.current = currentUserId;
  }, [session?.user?.id, status]);
}