import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// عزل الوحدة عن أي استدعاءات شبكة أو SDK فعلية (Stripe SDK، Tap/Moyasar HTTP، Prisma)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn(), list: vi.fn() } },
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

// نموذج مبسّط لقاعدة بيانات في الذاكرة. updateMany ينفّذ المقارنة والكتابة بشكل متزامن
// (ذري) تماماً كما يفعل UPDATE ... WHERE في PostgreSQL، ما يسمح باختبار سباقات التزامن.
function createFakePrisma() {
  const products = new Map<string, { id: string; stock: number; reservedStock: number }>([
    ["prod_1", { id: "prod_1", stock: 10, reservedStock: 20 }],
  ]);

  const orders = new Map<string, any>();
  const logs: { orderId: string; status: string; note: string }[] = [];

  const seedOrder = (id: string, status: string, paymentStatus: string, quantity = 2) =>
    orders.set(id, {
      id,
      paymentRef: `ref_${id}`,
      paymentStatus,
      status,
      items: [{ productId: "prod_1", variantId: null, quantity }],
    });

  seedOrder("order_1", "PENDING", "UNPAID");

  const tx = {
    product: {
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
      updateMany: vi.fn(({ where, data }: any) => {
        const o = orders.get(where.id);
        const matches =
          o &&
          (where.status === undefined || o.status === where.status) &&
          (where.paymentStatus === undefined || o.paymentStatus === where.paymentStatus);
        if (!matches) return Promise.resolve({ count: 0 });
        Object.assign(o, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    orderStatusLog: {
      create: vi.fn(({ data }: any) => {
        logs.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  return {
    $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(tx)),
    order: { findUnique: tx.order.findUnique, update: vi.fn(() => Promise.resolve({})) },
    orderStatusLog: tx.orderStatusLog,
    products,
    orders,
    logs,
    seedOrder,
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
    delete process.env.LOCAL_GATEWAY_API_KEY;
  });

  function sign(payload: any, amountForHash: string, key = secret) {
    const toHash =
      `x_id${payload.id}` +
      `x_amount${amountForHash}` +
      `x_currency${payload.currency}` +
      `x_gateway_reference${payload.reference.gateway}` +
      `x_payment_reference${payload.reference.payment}` +
      `x_status${payload.status}` +
      `x_created${payload.transaction.created}`;
    return crypto.createHmac("sha256", key).update(toHash).digest("hex");
  }

  function basePayload(overrides: Record<string, unknown> = {}) {
    return {
      id: "chg_123",
      amount: 100,
      currency: "SAR",
      status: "CAPTURED",
      reference: { gateway: "gw_ref", payment: "pay_ref", order: "order_1" },
      transaction: { created: "1700000000" },
      metadata: { orderId: "order_1" },
      ...overrides,
    };
  }

  it("يقبل حدثاً بتوقيع (hashstring) صحيح ويحوّله لحالة PAID مع المبلغ بأصغر وحدة", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload();
    const payload = { ...p, hashstring: sign(p, "100") };

    const event = tapProvider.verifyWebhook(JSON.stringify(payload), new Headers());

    expect(event.type).toBe("PAID");
    expect(event.orderId).toBe("order_1");
    expect(event.providerRef).toBe("chg_123");
    expect(event.amountInMinorUnits).toBe(10000);
    expect(event.currency).toBe("SAR");
  });

  it("يقبل التوقيع المحسوب على المبلغ مُنسَّقاً بخانات العملة (100.00) كما تفعل Tap", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload();
    const payload = { ...p, hashstring: sign(p, "100.00") };
    expect(tapProvider.verifyWebhook(JSON.stringify(payload), new Headers()).type).toBe("PAID");
  });

  it("يعالج العملات ثلاثية الخانات: KWD 10.5 ← 10500 فلس، والتوقيع على 10.500", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload({ amount: 10.5, currency: "KWD" });
    const payload = { ...p, hashstring: sign(p, "10.500") };
    const event = tapProvider.verifyWebhook(JSON.stringify(payload), new Headers());
    expect(event.amountInMinorUnits).toBe(10500);
  });

  it("يقرأ hashstring من الترويسة إن لم يكن في الجسم", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload();
    const headers = new Headers({ hashstring: sign(p, "100") });
    expect(tapProvider.verifyWebhook(JSON.stringify(p), headers).type).toBe("PAID");
  });

  it("يقبل التوقيع المحسوب بـ LOCAL_GATEWAY_API_KEY إن ضُبط (مفتاح Tap السري)", async () => {
    process.env.LOCAL_GATEWAY_API_KEY = "sk_live_tap_key";
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload();
    const payload = { ...p, hashstring: sign(p, "100", "sk_live_tap_key") };
    expect(tapProvider.verifyWebhook(JSON.stringify(payload), new Headers()).type).toBe("PAID");
  });

  it("يرفض حدثاً تم التلاعب بأحد حقوله (amount مختلف) رغم بقاء hashstring القديم", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    const p = basePayload();
    const tampered = { ...p, amount: 999999, hashstring: sign(p, "100") };

    expect(() => tapProvider.verifyWebhook(JSON.stringify(tampered), new Headers())).toThrow();
  });

  it("يرفض حدثاً بلا hashstring أو بلا سر مُهيأ", async () => {
    vi.resetModules();
    const { tapProvider } = await import("../providers/tap.provider");
    expect(() => tapProvider.verifyWebhook(JSON.stringify(basePayload()), new Headers())).toThrow();

    delete process.env.LOCAL_GATEWAY_WEBHOOK_SECRET;
    vi.resetModules();
    const mod = await import("../providers/tap.provider");
    expect(() => mod.tapProvider.verifyWebhook("{}", new Headers())).toThrow();
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

  it("يقبل حدثاً بـ secret_token صحيح ويحوّله لحالة PAID مع المبلغ والعملة", async () => {
    vi.resetModules();
    const { moyasarProvider } = await import("../providers/moyasar.provider");
    const payload = {
      type: "payment_paid",
      secret_token: secret,
      data: { id: "pay_123", status: "paid", amount: 5000, currency: "sar", metadata: { orderId: "order_1" } },
    };

    const event = moyasarProvider.verifyWebhook(JSON.stringify(payload), new Headers());

    expect(event.type).toBe("PAID");
    expect(event.orderId).toBe("order_1");
    expect(event.amountInMinorUnits).toBe(5000);
    expect(event.currency).toBe("SAR");
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
// 4) Stripe: التوقيع، تحويل الأحداث، ومهلة الجلسة
// ─────────────────────────────────────────────────────────────────────────────

describe("stripe.provider — verifyWebhook / createSession", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  async function load() {
    vi.resetModules();
    const { stripe } = await import("@/lib/stripe");
    const { stripeProvider } = await import("../providers/stripe.provider");
    return { stripe: stripe as any, stripeProvider };
  }
  const headers = () => new Headers({ "stripe-signature": "t=1,v1=abc" });

  it("يرفض بلا ترويسة توقيع", async () => {
    const { stripeProvider } = await load();
    expect(() => stripeProvider.verifyWebhook("{}", new Headers())).toThrow();
  });

  it("توقيع غير صالح ← رسالة عامة بلا تسريب لتفاصيل الـ SDK", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload SECRET-DETAIL");
    });
    try {
      stripeProvider.verifyWebhook("{}", headers());
      expect.unreachable();
    } catch (e: any) {
      expect(e.code).toBe("INVALID_SIGNATURE");
      expect(e.message).not.toContain("SECRET-DETAIL");
    }
  });

  it("checkout.session.completed (paid) ← PAID مع المبلغ والعملة", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: { id: "cs_1", payment_status: "paid", amount_total: 2500, currency: "usd", metadata: { orderId: "o1" } },
      },
    });
    const e = stripeProvider.verifyWebhook("{}", headers());
    expect(e).toMatchObject({ type: "PAID", orderId: "o1", providerRef: "cs_1", amountInMinorUnits: 2500, currency: "USD" });
  });

  it("checkout.session.completed بحالة unpaid ← UNKNOWN (لا يؤكد الطلب)", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", payment_status: "unpaid", metadata: { orderId: "o1" } } },
    });
    expect(stripeProvider.verifyWebhook("{}", headers()).type).toBe("UNKNOWN");
  });

  it("checkout.session.expired ← FAILED", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_3",
      type: "checkout.session.expired",
      data: { object: { id: "cs_3", metadata: { orderId: "o1" } } },
    });
    expect(stripeProvider.verifyWebhook("{}", headers())).toMatchObject({ type: "FAILED", orderId: "o1" });
  });

  it("charge.refunded ← REFUNDED ويحمل payment_intent، ويُحوَّل إلى معرّف الجلسة المخزّن", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.webhooks.constructEvent.mockReturnValue({
      id: "evt_4",
      type: "charge.refunded",
      data: { object: { id: "ch_1", payment_intent: "pi_1" } },
    });
    const e = stripeProvider.verifyWebhook("{}", headers());
    expect(e).toMatchObject({ type: "REFUNDED", providerRef: "pi_1" });

    stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_9" }] });
    await expect(stripeProvider.resolveOrderPaymentRef!(e)).resolves.toBe("cs_9");
    expect(stripe.checkout.sessions.list).toHaveBeenCalledWith({ payment_intent: "pi_1", limit: 1 });
  });

  it("createSession يضبط expires_at أقل من مهلة الـ Cron (60 دقيقة) وأكبر من حد Stripe الأدنى (30)", async () => {
    const { stripe, stripeProvider } = await load();
    stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_new", url: "https://pay" });
    const before = Math.floor(Date.now() / 1000);
    await stripeProvider.createSession({ orderId: "o1", amountInCents: 1000, currency: "usd" });
    const args = stripe.checkout.sessions.create.mock.calls[0][0];
    const ttlMin = (args.expires_at - before) / 60;
    expect(ttlMin).toBeGreaterThanOrEqual(30);
    expect(ttlMin).toBeLessThan(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) Idempotency والتزامن: تأكيد الدفع / تحرير المخزون / الدفع المتأخر
// ─────────────────────────────────────────────────────────────────────────────

describe("checkout.repository — Idempotency والتزامن", () => {
  beforeEach(() => {
    vi.resetModules();
    fakePrisma.logs.length = 0;
    fakePrisma.products.set("prod_1", { id: "prod_1", stock: 10, reservedStock: 20 });
  });

  it("markOrderPaid لا يخصم المخزون مرتين إذا استُدعي مرتين متتاليتين", async () => {
    fakePrisma.seedOrder("order_1", "PENDING", "UNPAID", 2);
    const { markOrderPaid } = await import("../../checkout/checkout.repository");

    const first = await markOrderPaid("order_1", "Stripe");
    const stockAfterFirst = fakePrisma.products.get("prod_1")!.stock;
    const second = await markOrderPaid("order_1", "Stripe");

    expect(first.outcome).toBe("CONFIRMED");
    expect(second.outcome).toBe("ALREADY_PAID");
    expect(fakePrisma.products.get("prod_1")!.stock).toBe(stockAfterFirst);
    expect(fakePrisma.orders.get("order_1")).toMatchObject({ paymentStatus: "PAID", status: "CONFIRMED" });
  });

  it("تسليمان متزامنان لنفس الحدث: ينجح أحدهما فقط ويُخصم المخزون مرة واحدة", async () => {
    fakePrisma.seedOrder("order_race", "PENDING", "UNPAID", 3);
    const { markOrderPaid } = await import("../../checkout/checkout.repository");

    const results = await Promise.all([
      markOrderPaid("order_race", "Stripe"),
      markOrderPaid("order_race", "Stripe"),
      markOrderPaid("order_race", "Stripe"),
    ]);

    expect(results.filter((r) => r.outcome === "CONFIRMED")).toHaveLength(1);
    expect(results.filter((r) => r.outcome === "ALREADY_PAID")).toHaveLength(2);
    const p = fakePrisma.products.get("prod_1")!;
    expect(p.stock).toBe(7); // 10 - 3 مرة واحدة فقط
    expect(p.reservedStock).toBe(17); // 20 - 3 مرة واحدة فقط
    expect(fakePrisma.logs.filter((l) => l.orderId === "order_race")).toHaveLength(1);
  });

  it("دفعة متأخرة على طلب FAILED: لا تأكيد، لا خصم مخزون، وتُعاد NOT_PAYABLE", async () => {
    fakePrisma.seedOrder("order_late", "FAILED", "FAILED", 2);
    const { markOrderPaid } = await import("../../checkout/checkout.repository");

    const r = await markOrderPaid("order_late", "Stripe");

    expect(r).toMatchObject({ outcome: "NOT_PAYABLE", status: "FAILED" });
    expect(fakePrisma.orders.get("order_late")).toMatchObject({ status: "FAILED", paymentStatus: "FAILED" });
    expect(fakePrisma.products.get("prod_1")).toMatchObject({ stock: 10, reservedStock: 20 });
  });

  it("طلب مُسترد أو قيد الاسترداد يُعد ALREADY_PAID ولا يُمسّ", async () => {
    const { markOrderPaid } = await import("../../checkout/checkout.repository");
    fakePrisma.seedOrder("order_refunded", "CANCELLED", "REFUNDED");
    fakePrisma.seedOrder("order_refunding", "CONFIRMED", "PENDING");
    expect((await markOrderPaid("order_refunded")).outcome).toBe("ALREADY_PAID");
    expect((await markOrderPaid("order_refunding")).outcome).toBe("ALREADY_PAID");
    expect(await markOrderPaid("missing")).toEqual({ outcome: "NOT_FOUND" });
  });

  it("releaseReservedStock لا يُحرر المخزون مرتين لطلب فشل بالفعل", async () => {
    fakePrisma.seedOrder("order_2", "PENDING", "UNPAID", 1);
    const { releaseReservedStock } = await import("../../checkout/checkout.repository");

    await releaseReservedStock("order_2", "فشل الدفع");
    const reservedAfterFirst = fakePrisma.products.get("prod_1")!.reservedStock;
    await releaseReservedStock("order_2", "فشل الدفع مكرر");

    expect(reservedAfterFirst).toBe(19);
    expect(fakePrisma.products.get("prod_1")!.reservedStock).toBe(19);
    expect(fakePrisma.orders.get("order_2")!.status).toBe("FAILED");
    expect(fakePrisma.logs.filter((l) => l.orderId === "order_2")).toHaveLength(1);
  });

  it("releaseReservedStock لا يُحرر مخزون طلب مدفوع", async () => {
    fakePrisma.seedOrder("order_paid", "CONFIRMED", "PAID", 2);
    const { releaseReservedStock } = await import("../../checkout/checkout.repository");
    await releaseReservedStock("order_paid", "حدث فشل متأخر");
    expect(fakePrisma.orders.get("order_paid")).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(fakePrisma.products.get("prod_1")!.reservedStock).toBe(20);
  });

  it("سباق تأكيد وفشل على نفس الطلب: يربح أحدهما فقط ولا يختل المخزون", async () => {
    fakePrisma.seedOrder("order_mix", "PENDING", "UNPAID", 2);
    const { markOrderPaid, releaseReservedStock } = await import("../../checkout/checkout.repository");

    const [paid] = await Promise.all([markOrderPaid("order_mix"), releaseReservedStock("order_mix", "x")]);

    const o = fakePrisma.orders.get("order_mix");
    const p = fakePrisma.products.get("prod_1")!;
    if (paid.outcome === "CONFIRMED") {
      expect(o.status).toBe("CONFIRMED");
      expect(p).toMatchObject({ stock: 8, reservedStock: 18 });
    } else {
      expect(o.status).toBe("FAILED");
      expect(p).toMatchObject({ stock: 10, reservedStock: 18 });
    }
  });
});