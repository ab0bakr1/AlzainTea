"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "@/modules/orders/order-status";

export interface AdminOrderFilters {
  page: number;
  status: OrderStatusValue | "";
  paymentStatus: PaymentStatusValue | "";
  country: string;
  q: string;
  from: string;
  to: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_KEYS = ["status", "paymentStatus", "country", "q", "from", "to"] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

/** فلاتر قائمة الطلبات محفوظة في الرابط: قابلة للمشاركة وتبقى بعد التحديث والرجوع */
export function useAdminOrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filters = useMemo<AdminOrderFilters>(() => {
    const page = Number.parseInt(sp.get("page") ?? "1", 10);
    const country = (sp.get("country") ?? "").toUpperCase();
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      status: pick(sp.get("status"), ORDER_STATUSES),
      paymentStatus: pick(sp.get("paymentStatus"), PAYMENT_STATUSES),
      country: /^[A-Z]{2}$/.test(country) ? country : "",
      q: (sp.get("q") ?? "").slice(0, 100),
      from: DATE_RE.test(from) ? from : "",
      to: DATE_RE.test(to) ? to : "",
    };
  }, [sp]);

  /** أي تغيير في الفلاتر يعيد الترقيم إلى الصفحة 1 ما لم تُمرَّر page صراحةً */
  const setFilters = useCallback(
    (patch: Partial<AdminOrderFilters>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === "" || value == null || (key === "page" && value === 1)) next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname]
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);
  const activeCount = FILTER_KEYS.filter((k) => filters[k] !== "").length;

  return { filters, setFilters, reset, activeCount };
}