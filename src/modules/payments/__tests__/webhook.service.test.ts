import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const repo = vi.hoisted(() => ({
  findOrderByPaymentRef: vi.fn(),
  markOrderPaid: vi.fn(),
  releaseReservedStock: vi.fn(),
  addOrderAuditNote: vi.fn(),
}));
vi.mock("@/modules/checkout/checkout.repository", () => repo);

const pay = vi.hoisted(() => ({
  verifyProviderWebhook: vi.fn(),
  resolveOrderPaymentRef: vi.fn(),
}));
vi.mock("../payment.service", () => pay);

import {
  checkPaidAmount,
  handlePaymentEvent,
  verifyWebhookOrReject,
} from "../webhook.service";
import type { WebhookEvent } from "../payment.types";

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  paymentStatus: "UNPAID",
  currency: "SAR",
  total: "100.00",
  ...over,
});
const paid = (over: Partial<WebhookEvent> = {}): WebhookEvent => ({
  type: "PAID",
  orderId: "o1",
  providerRef: "ref1",
  amountInMinorUnits: 10000,
  currency: "SAR",
  raw: {},
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  delete process.env.WEBHOOK_AMOUNT_CHECK;
});
afterEach(() => vi.restoreAllMocks());

describe("verifyWebhookOrReject", () => {
  it("يحوّل أي فشل تحقق إلى 400 INVALID_SIGNATURE برسالة عامة", () => {
    pay.verifyProviderWebhook.mockImplementation(() => {
      throw new Error("internal SDK detail");
    });
    try {
      verifyWebhookOrReject("stripe", "{}", new Headers());
      expect.unreachable();
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.code).toBe("INVALID_SIGNATURE");
      expect(e.message).not.toContain("internal SDK detail");
    }
  });
});

describe("handlePaymentEvent — PAID", () => {
  it("تأكيد ناجح ← CONFIRMED ويطلب جدولة البريد", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(order());
    repo.markOrderPaid.mockResolvedValue({ outcome: "CONFIRMED", order: {} });
    const r = await handlePaymentEvent("stripe", "Stripe", paid());
    expect(r).toEqual({ outcome: "CONFIRMED", confirmationEmailOrderId: "o1" });
    expect(repo.markOrderPaid).toHaveBeenCalledWith("o1", "Stripe");
  });

  it("حدث مكرر ← DUPLICATE ويعيد جدولة البريد (آمن بفضل الحجز الذري)", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(order({ paymentStatus: "PAID" }));
    repo.markOrderPaid.mockResolvedValue({ outcome: "ALREADY_PAID" });
    const r = await handlePaymentEvent("stripe", "Stripe", paid());
    expect(r).toEqual({ outcome: "DUPLICATE", confirmationEmailOrderId: "o1" });
  });

  it("دفعة بلا طلب مطابق ← ANOMALY مع تنبيه، ولا markOrderPaid", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(null);
    const r = await handlePaymentEvent("tap", "Tap", paid());
    expect(r.outcome).toBe("ANOMALY");
    expect(repo.markOrderPaid).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PAID_WITHOUT_ORDER"), expect.any(String));
  });

  it("orderId في الحدث لا يطابق الطلب المرتبط بـ paymentRef ← ANOMALY بلا تأكيد", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(order({ id: "other" }));
    const r = await handlePaymentEvent("tap", "Tap", paid());
    expect(r.outcome).toBe("ANOMALY");
    expect(repo.markOrderPaid).not.toHaveBeenCalled();
  });

  it("دفعة متأخرة على طلب مغلق ← ANOMALY + ملاحظة تدقيق، بلا بريد تأكيد", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(order());
    repo.markOrderPaid.mockResolvedValue({ outcome: "NOT_PAYABLE", status: "FAILED", paymentStatus: "FAILED" });
    const r = await handlePaymentEvent("stripe", "Stripe", paid());
    expect(r).toEqual({ outcome: "ANOMALY" });
    expect(repo.addOrderAuditNote).toHaveBeenCalledWith("o1", expect.stringContaining("استرداد"));
  });

  it("عدم تطابق المبلغ في الوضع الافتراضي (warn): ينبّه لكن يؤكد الطلب", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(order());
    repo.markOrderPaid.mockResolvedValue({ outcome: "CONFIRMED", order: {} });
    const r = await handlePaymentEvent("tap", "Tap", paid({ amountInMinorUnits: 5000 }));
    expect(r.outcome).toBe("CONFIRMED");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("AMOUNT_MISMATCH"), expect.any(String));
  });

  it("عدم تطابق المبلغ في وضع enforce: لا تأكيد + ملاحظة تدقيق", async () => {
    process.env.WEBHOOK_AMOUNT_CHECK = "enforce";
    repo.findOrderByPaymentRef.mockResolvedValue(order());
    const r = await handlePaymentEvent("tap", "Tap", paid({ amountInMinorUnits: 5000 }));
    expect(r.outcome).toBe("ANOMALY");
    expect(repo.markOrderPaid).not.toHaveBeenCalled();
    expect(repo.addOrderAuditNote).toHaveBeenCalled();
  });

  it("اختلاف العملة يُكتشف أيضاً (enforce)", async () => {
    process.env.WEBHOOK_AMOUNT_CHECK = "enforce";
    repo.findOrderByPaymentRef.mockResolvedValue(order());
    const r = await handlePaymentEvent("tap", "Tap", paid({ currency: "USD" }));
    expect(r.outcome).toBe("ANOMALY");
  });
});

describe("checkPaidAmount", () => {
  it("يتطابق تماماً للعملات ثنائية الخانات ويسمح بفارق وحدة واحدة فقط", () => {
    expect(checkPaidAmount({ total: "25.00", currency: "USD" }, { amountInMinorUnits: 2500, currency: "USD" }).ok).toBe(true);
    expect(checkPaidAmount({ total: "25.00", currency: "USD" }, { amountInMinorUnits: 2501, currency: "USD" }).ok).toBe(true);
    expect(checkPaidAmount({ total: "25.00", currency: "USD" }, { amountInMinorUnits: 2510, currency: "USD" }).ok).toBe(false);
  });

  it("KWD: يتسامح مع تقريب الخانة الثالثة الناتج عن عمود Decimal(10,2)", () => {
    // الطلب خُزّن 10.51 بينما حُصّل 10.505 د.ك = 10505 فلس
    expect(checkPaidAmount({ total: "10.51", currency: "KWD" }, { amountInMinorUnits: 10505, currency: "KWD" }).ok).toBe(true);
    expect(checkPaidAmount({ total: "10.51", currency: "KWD" }, { amountInMinorUnits: 9000, currency: "KWD" }).ok).toBe(false);
  });

  it("بلا مبلغ/عملة في الحدث لا يوجد ما يُقارَن", () => {
    expect(checkPaidAmount({ total: "1", currency: "SAR" }, {}).ok).toBe(true);
  });
});

describe("handlePaymentEvent — FAILED / REFUNDED / UNKNOWN", () => {
  it("FAILED ← releaseReservedStock بسبب يذكر المزوّد", async () => {
    const r = await handlePaymentEvent("moyasar", "Moyasar", { type: "FAILED", orderId: "o1", providerRef: "p", raw: {} });
    expect(r.outcome).toBe("RELEASED");
    expect(repo.releaseReservedStock).toHaveBeenCalledWith("o1", expect.stringContaining("Moyasar"));
  });

  it("FAILED بلا orderId يُطابق الطلب عبر paymentRef", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue({ id: "o9" });
    await handlePaymentEvent("stripe", "Stripe", { type: "FAILED", providerRef: "cs_1", raw: {} });
    expect(repo.releaseReservedStock).toHaveBeenCalledWith("o9", expect.any(String));
  });

  it("FAILED بلا أي طلب مطابق يُتجاهل", async () => {
    repo.findOrderByPaymentRef.mockResolvedValue(null);
    const r = await handlePaymentEvent("stripe", "Stripe", { type: "FAILED", providerRef: "cs_x", raw: {} });
    expect(r.outcome).toBe("IGNORED");
    expect(repo.releaseReservedStock).not.toHaveBeenCalled();
  });

  it("استرداد خارجي لطلب مدفوع ← ANOMALY + ملاحظة تدقيق (بلا تغيير تلقائي للحالة)", async () => {
    pay.resolveOrderPaymentRef.mockResolvedValue("cs_1");
    repo.findOrderByPaymentRef.mockResolvedValue(order({ paymentStatus: "PAID" }));
    const r = await handlePaymentEvent("stripe", "Stripe", { type: "REFUNDED", providerRef: "pi_1", raw: {} });
    expect(r.outcome).toBe("ANOMALY");
    expect(repo.addOrderAuditNote).toHaveBeenCalledWith("o1", expect.stringContaining("استرداد"));
  });

  it("استرداد بدأه النظام (paymentStatus ≠ PAID) يُتجاهل", async () => {
    pay.resolveOrderPaymentRef.mockResolvedValue("cs_1");
    for (const ps of ["PENDING", "REFUNDED"]) {
      repo.findOrderByPaymentRef.mockResolvedValue(order({ paymentStatus: ps }));
      const r = await handlePaymentEvent("stripe", "Stripe", { type: "REFUNDED", providerRef: "pi_1", raw: {} });
      expect(r.outcome).toBe("DUPLICATE");
    }
    expect(repo.addOrderAuditNote).not.toHaveBeenCalled();
  });

  it("UNKNOWN يُتجاهل", async () => {
    expect((await handlePaymentEvent("stripe", "Stripe", { type: "UNKNOWN", providerRef: "e", raw: {} })).outcome).toBe("IGNORED");
  });
});