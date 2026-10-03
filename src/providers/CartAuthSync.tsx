// src/providers/CartAuthSync.tsx
"use client";

import { useCartAuthSync } from "@/hooks/useCartAuthSync";

// مكوّن بلا واجهة: يجب أن يعيش داخل SessionProvider ليعمل useSession
export default function CartAuthSync() {
  useCartAuthSync();
  return null;
}