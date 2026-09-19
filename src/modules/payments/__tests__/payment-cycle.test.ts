import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// عزل الوحدة عن أي استدعاءات شبكة أو SDK فعلية (Stripe SDK، Tap/Moyasar HTTP، Prisma)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
    refunds: { create: vi.fn() },
  },
}));

vi.mock("@/lib/payment-gateway", () => ({
  createTapCharge: vi.fn(),
  refundTapCharge: vi.fn(),
  createMoyasarPayment: vi.fn(),
  refundMoyasarPayment: vi.fn(),
}));

// نموذج مبسّط لقاعدة بيانات في الذاكرة لاختبار Idempotency دون الحاجة لـ DB حقيقية
function createFakePrisma() {
  const products = new Map<string, { id: string; stock: number; reservedStock: number }>([
    ["prod_1", { id: "prod_1", stock: 10, reservedStock: 2 }],
  ]);

  const orders = new Map<string, any>([
    [
      "order_1",
      {
        id: "order_1",
        paymentRef: "ref_1",
        paymentStatus: "UNPAID",
        status: "PENDING",
        items: [{ productId: "prod_1", variantId: null, quantity: 2 }],
      },
    ],
  ]);

  const tx = {
    product: {
      findUnique: vi.fn(({ where: { id } }: any) => Promise.resolve(products.get(id) ?? null)),
      update: vi.fn(({ where: { id }, data }: any) => {
        const p = products.get(id)!;
        if (data.stock?.decrement) p.stock -= data.stock.decrement;
        if (data.reservedStock?.increment) p.reservedStock += data.reservedStock.increment;
        if (data.reservedStock?.decrement) p.reservedStock -= data.reservedStock.decrement;
        return Promise.resolve(p);
      }),
    },
    productVariant: { findUnique: vi.fn(), update: vi.fn() },
    order: {
      findUnique: vi.fn(({ where: { id } }: any) => Promise.resolve(orders.get(id) ?? null)),
      update: vi.fn(({ where: { id }, data }: any) => {
        const o = orders.get(id)!;
        Object.assign(o, data, data.paymentStatus ? { paymentStatus: data.paymentStatus } : {});
        return Promise.resolve(o);
      }),
    },
  };

  return {
    $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(tx)),
    order: {
      findUnique: tx.order.findUnique,
      update: tx.order.update,
    },
    products,
    orders,
  };
}

const fakePrisma = createFakePrisma();
vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));

// ─────────────────────────────────────────────────────────────────────────────
// 1) توجيه البوابة حسب الدولة + قراءة الـ Feature Flag
// ─────────────────────────────────────────────────────────────────────────────

describe("payment.service — resolveGateway / getActiveLocalGateway", () => {
  const originalEnv = process.env.PAYMENT_PROVIDER;

  afterEach(() => {
    process.env.PAYMENT_PROVIDER = originalEnv;
    vi.resetModules();
  });

  it("يوجّه الدول غير الخليجية إلى Stripe دائماً", async () => {
    const { resolveGateway } = await import("../payment.service");
    expect(resolveGateway("US")).toBe("stripe");
    expect(resolveGateway("GB")).toBe("stripe");
  });

  it("يوجّه دول الخليج إلى Tap عندما PAYMENT_PROVIDER=tap", async () => {
    process.env.PAYMENT_PROVIDER = "tap";
    vi.resetModules();
    const { resolveGateway } = await import("../payment.service");
    expect(resolveGateway("SA")).toBe("tap");
    expect(resolveGateway("ae")).toBe("tap"); // غير حساس لحالة الأحرف
  });

  it("يوجّه دول الخليج إلى Moyasar عندما PAYMENT_PROVIDER=moyasar (تبديل بلا تعديل كود)", async () => {
    process.env.PAYMENT_PROVIDER = "moyasar";
    vi.resetModules();
    const { resolveGateway } = await import("../payment.service");
    expect(resolveGateway("KW")).toBe("moyasar");
  });

  it("يرمي خطأً واضحاً عند قيمة PAYMENT_PROVIDER غير مدعومة", async () => {
    process.env.PAYMENT_PROVIDER = "paypal";
    vi.resetModules();
    const { getActiveLocalGateway } = await import("../payment.service");
    expect(() => getActiveLocalGateway()).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) التحقق من توقيع Tap (hashstring)
// ─────────────────────────────────────────────────────────────────────────────

describe("tap.provider — verifyWebhook", () => {
  const secret = "test_tap_secret";

  beforeEach(() => {
    process.env.LOCAL_GATEWAY_WEBHOOK_SECRET = secret;
  });

  function buildValidPayload() {
    const payload = {
      id: "chg_123",
      amount: 100,
      currency: "SAR",
      status: "CAPTURED",
      reference: { gateway: "gw_ref", payment: "pay_ref", order: "order_1" },
      transaction: { created: "1700000000" },
      metadata: { orderId: "order_1" },
    };
    const toHash =
      `x_id${payload.id}` +
      `x_amount${payload.amount}` +
      `x_currency${payload.currency}` +
      `x_gateway_reference${payload.reference.gateway}` +
      `x_payment_reference${payload.reference.payment}` +
      `x_status${payload.status}` +
      `x_created${payload.transaction.created}`;
    const hashstring = crypto.createHmac("sha256", secret).update(toHash).digest("hex");
    return { ...payload, hashstring };
  }

  it("يقبل حدثاً بتوقيع (hashstring) صحيح ويحوّله لحالة PAID", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const payload = buildValidPayload();

    const event = tapProvider.verifyWebhook(JSON.stringify(payload), new Headers());

    expect(event.type).toBe("PAID");
    expect(event.orderId).toBe("order_1");
    expect(event.providerRef).toBe("chg_123");
  });

  it("يرفض حدثاً تم التلاعب بأحد حقوله (amount مختلف) رغم بقاء hashstring القديم", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const payload = buildValidPayload();
    const tampered = { ...payload, amount: 999999 };

    expect(() => tapProvider.verifyWebhook(JSON.stringify(tampered), new Headers())).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) التحقق من secret_token الخاص بـ Moyasar
// ─────────────────────────────────────────────────────────────────────────────

describe("moyasar.provider — verifyWebhook", () => {
  const secret = "test_moyasar_secret";

  beforeEach(() => {
    process.env.LOCAL_GATEWAY_WEBHOOK_SECRET = secret;
  });

  it("يقبل حدثاً بـ secret_token صحيح ويحوّله لحالة PAID", async () => {
    vi.resetModules();
    const { moyasarProvider } = await import("../providers/moyasar.provider");
    const payload = {
      type: "payment_paid",
      secret_token: secret,
      data: { id: "pay_123", status: "paid", metadata: { orderId: "order_1" } },
    };

    const event = moyasarProvider.verifyWebhook(JSON.stringify(payload), new Headers());

    expect(event.type).toBe("PAID");
    expect(event.orderId).toBe("order_1");
  });

  it("يرفض حدثاً بـ secret_token خاطئ", async () => {
    vi.resetModules();
    const { moyasarProvider } = await import("../providers/moyasar.provider");
    const payload = {
      type: "payment_paid",
      secret_token: "wrong_token",
      data: { id: "pay_123", status: "paid" },
    };

    expect(() => moyasarProvider.verifyWebhook(JSON.stringify(payload), new Headers())).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Idempotency: تأكيد الدفع مرتين، وتحرير المخزون مرتين، يجب ألا يُضاعفا الأثر
// ─────────────────────────────────────────────────────────────────────────────

describe("checkout.repository — Idempotency عند تأكيد/فشل الدفع", () => {
  it("markOrderPaid لا يخصم المخزون مرتين إذا استُدعي مرتين لنفس الطلب", async () => {
    vi.resetModules();
    const { markOrderPaid } = await import("../../checkout/checkout.repository");

    await markOrderPaid("order_1", "Stripe");
    const stockAfterFirstCall = fakePrisma.products.get("prod_1")!.stock;

    await markOrderPaid("order_1", "Stripe"); // نفس حدث الـ Webhook يصل مكرراً
    const stockAfterSecondCall = fakePrisma.products.get("prod_1")!.stock;

    expect(stockAfterSecondCall).toBe(stockAfterFirstCall); // لم يتغير المخزون في المرة الثانية
    expect(fakePrisma.orders.get("order_1")!.paymentStatus).toBe("PAID");
  });

  it("releaseReservedStock لا يُحرر المخزون مرتين لطلب فشل بالفعل", async () => {
    vi.resetModules();
    // طلب منفصل غير مدفوع لاختبار مسار الفشل بمعزل عن اختبار markOrderPaid أعلاه
    fakePrisma.orders.set("order_2", {
      id: "order_2",
      paymentRef: "ref_2",
      paymentStatus: "UNPAID",
      status: "PENDING",
      items: [{ productId: "prod_1", variantId: null, quantity: 1 }],
    });

    const { releaseReservedStock } = await import("../../checkout/checkout.repository");

    await releaseReservedStock("order_2", "فشل الدفع");
    const reservedAfterFirstCall = fakePrisma.products.get("prod_1")!.reservedStock;

    await releaseReservedStock("order_2", "فشل الدفع مكرر"); // الطلب FAILED بالفعل الآن
    const reservedAfterSecondCall = fakePrisma.products.get("prod_1")!.reservedStock;

    expect(reservedAfterSecondCall).toBe(reservedAfterFirstCall);
    expect(fakePrisma.orders.get("order_2")!.status).toBe("FAILED");
  });
});