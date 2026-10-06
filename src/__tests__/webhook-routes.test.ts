import { describe, it, expect, vi, beforeEach } from "vitest";

// next/server مُحاكى بالكامل: after() يعمل خارج نطاق الطلب فقط عبر المحاكاة
const afterSpy = vi.hoisted(() => vi.fn((cb: () => unknown) => void cb()));
vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
  after: afterSpy,
}));

const svc = vi.hoisted(() => ({
  verifyWebhookOrReject: vi.fn(),
  handlePaymentEvent: vi.fn(),
}));
vi.mock("@/modules/payments/webhook.service", () => svc);

const emailSpy = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: true }));
vi.mock("@/modules/notifications/notification.service", () => ({ sendOrderConfirmationEmail: emailSpy }));

const gw = vi.hoisted(() => ({ getActiveLocalGateway: vi.fn() }));
vi.mock("@/modules/payments/payment.service", () => gw);

import { POST as stripePOST } from "@/app/api/webhooks/stripe/route";
import { POST as localPOST } from "@/app/api/webhooks/local-gateway/route";
import { ApiError } from "@/lib/api-error";

const req = (body = "{}") => ({ text: async () => body, headers: new Headers() }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  svc.verifyWebhookOrReject.mockReturnValue({ type: "PAID", providerRef: "r", raw: {} });
  gw.getActiveLocalGateway.mockReturnValue("tap");
});

describe.each([
  ["stripe", stripePOST, "stripe", "Stripe"],
  ["local-gateway", localPOST, "tap", "Tap"],
] as const)("POST /api/webhooks/%s", (_name, POST, gateway, label) => {
  it("حدث صالح ← 200 { success, received } ويجدول بريد التأكيد عبر after()", async () => {
    svc.handlePaymentEvent.mockResolvedValue({ outcome: "CONFIRMED", confirmationEmailOrderId: "o1" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, received: true });
    expect(svc.handlePaymentEvent).toHaveBeenCalledWith(gateway, label, expect.anything());
    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(emailSpy).toHaveBeenCalledWith("o1");
  });

  it("حدث لا يتطلب بريداً ← 200 بلا after()", async () => {
    svc.handlePaymentEvent.mockResolvedValue({ outcome: "RELEASED" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(afterSpy).not.toHaveBeenCalled();
  });

  it("فشل التحقق ← 400 INVALID_SIGNATURE بالصيغة الموحدة", async () => {
    svc.verifyWebhookOrReject.mockImplementation(() => {
      throw new ApiError("INVALID_SIGNATURE", "تعذر التحقق من الحدث الوارد", 400);
    });
    const res = await POST(req());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "INVALID_SIGNATURE", message: "تعذر التحقق من الحدث الوارد", statusCode: 400 },
    });
    expect(svc.handlePaymentEvent).not.toHaveBeenCalled();
  });

  it("خطأ غير متوقع (مثل قاعدة البيانات) ← 500 آمن بلا تسريب، ليعيد المزوّد المحاولة", async () => {
    svc.handlePaymentEvent.mockRejectedValue(new Error("connection to db-host:5432 refused"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("db-host");
  });
});

describe("local-gateway: PAYMENT_PROVIDER غير صالح", () => {
  it("يُعاد 500 CONFIG_ERROR منظّماً بدل استثناء غير معالج", async () => {
    gw.getActiveLocalGateway.mockImplementation(() => {
      throw new ApiError("CONFIG_ERROR", "قيمة PAYMENT_PROVIDER غير مدعومة", 500);
    });
    const res = await localPOST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("CONFIG_ERROR");
  });

  it("يستخدم Moyasar عند PAYMENT_PROVIDER=moyasar", async () => {
    gw.getActiveLocalGateway.mockReturnValue("moyasar");
    svc.handlePaymentEvent.mockResolvedValue({ outcome: "IGNORED" });
    await localPOST(req());
    expect(svc.verifyWebhookOrReject).toHaveBeenCalledWith("moyasar", "{}", expect.anything());
    expect(svc.handlePaymentEvent).toHaveBeenCalledWith("moyasar", "Moyasar", expect.anything());
  });
});