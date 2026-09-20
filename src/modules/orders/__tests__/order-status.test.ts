import { describe, expect, it } from "vitest";
import {
  ADMIN_SETTABLE_STATUSES,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  allowedNextStatusesForAdmin,
  canTransition,
  isTerminalStatus,
  planTransition,
} from "../order-status";

describe("order state machine", () => {
  it("كل هدف انتقال هو حالة صالحة", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_TRANSITIONS[from]) {
        expect(ORDER_STATUSES).toContain(to);
      }
    }
  });

  it("الحالات النهائية لا تنتقل لأي مكان", () => {
    for (const s of ["CANCELLED", "REFUNDED", "FAILED"] as const) {
      expect(isTerminalStatus(s)).toBe(true);
    }
  });

  it("يرفض القفز فوق المراحل", () => {
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
    expect(canTransition("CONFIRMED", "DELIVERED")).toBe(false);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
  });

  it("المدير لا يستطيع تعيين PENDING / CONFIRMED / FAILED يدوياً", () => {
    for (const s of ["PENDING", "CONFIRMED", "FAILED"]) {
      expect(ADMIN_SETTABLE_STATUSES as readonly string[]).not.toContain(s);
    }
    expect(allowedNextStatusesForAdmin("PENDING")).toEqual(["CANCELLED"]);
    expect(allowedNextStatusesForAdmin("CONFIRMED")).toEqual(["PROCESSING", "CANCELLED"]);
  });
});

describe("planTransition", () => {
  it("إلغاء طلب غير مدفوع → تحرير المخزون المحجوز بدون استرداد", () => {
    const r = planTransition({ status: "PENDING", paymentStatus: "UNPAID" }, "CANCELLED");
    expect(r).toEqual({ ok: true, plan: { stock: "RELEASE_RESERVED", refund: false } });
  });

  it("إلغاء طلب مدفوع → إعادة المخزون + استرداد", () => {
    const r = planTransition({ status: "CONFIRMED", paymentStatus: "PAID" }, "CANCELLED");
    expect(r).toEqual({
      ok: true,
      plan: { stock: "RESTOCK", refund: true, paymentStatus: "REFUNDED" },
    });
  });

  it("يرفض الإلغاء أثناء معالجة الدفع", () => {
    const r = planTransition({ status: "PENDING", paymentStatus: "PENDING" }, "CANCELLED");
    expect(r).toMatchObject({ ok: false, code: "PAYMENT_IN_PROGRESS" });
  });

  it("إنهاء مهلة الدفع → FAILED مع تحرير المخزون", () => {
    const r = planTransition({ status: "PENDING", paymentStatus: "UNPAID" }, "FAILED");
    expect(r).toEqual({
      ok: true,
      plan: { stock: "RELEASE_RESERVED", refund: false, paymentStatus: "FAILED" },
    });
  });

  it("المرتجع: يعيد المخزون فقط إذا طُلب ذلك", () => {
    const base = { status: "DELIVERED", paymentStatus: "PAID" } as const;
    expect(planTransition(base, "RETURNED")).toMatchObject({ ok: true, plan: { stock: "NONE" } });
    expect(planTransition(base, "RETURNED", { restock: true })).toMatchObject({
      ok: true,
      plan: { stock: "RESTOCK" },
    });
  });

  it("الاسترداد يتطلب طلباً مدفوعاً", () => {
    expect(
      planTransition({ status: "RETURNED", paymentStatus: "REFUNDED" }, "REFUNDED")
    ).toMatchObject({ ok: false, code: "NOT_REFUNDABLE" });
    expect(
      planTransition({ status: "RETURNED", paymentStatus: "PAID" }, "REFUNDED")
    ).toMatchObject({ ok: true, plan: { refund: true, stock: "NONE" } });
  });

  it("يرفض الانتقال غير المسموح", () => {
    expect(
      planTransition({ status: "PENDING", paymentStatus: "UNPAID" }, "SHIPPED")
    ).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
  });
});