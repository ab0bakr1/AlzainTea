import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../notification.repository", () => ({
  findOrderForEmail: vi.fn(),
  claimConfirmationEmail: vi.fn(),
  revertConfirmationEmailClaim: vi.fn(),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { sendEmail } from "@/lib/email";
import * as repo from "../notification.repository";
import { sendOrderConfirmationEmail } from "../notification.service";

const baseOrder = {
  id: "clxxxxxxxxabcd1234",
  userId: "u1",
  guestEmail: null,
  paymentStatus: "PAID",
  currency: "SAR",
  subtotal: "100",
  discount: "0",
  shippingCost: "20",
  tax: "18",
  total: "138",
  user: { email: "a@b.com", name: "علي أحمد" },
  shippingAddress: { fullName: "علي أحمد" },
  items: [
    { quantity: 2, price: "50", product: { nameAr: "شاي", nameEn: "Tea" }, variant: null },
  ],
};

describe("sendOrderConfirmationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.findOrderForEmail).mockResolvedValue(baseOrder as never);
  });

  it("يرسل البريد مرة واحدة عند نجاح الحجز", async () => {
    vi.mocked(repo.claimConfirmationEmail).mockResolvedValue(true);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true });
    const res = await sendOrderConfirmationEmail("o1");
    expect(res.sent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("لا يرسل إذا أُرسل مسبقاً (Idempotency)", async () => {
    vi.mocked(repo.claimConfirmationEmail).mockResolvedValue(false);
    const res = await sendOrderConfirmationEmail("o1");
    expect(res).toEqual({ sent: false, reason: "ALREADY_SENT" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("يلغي الحجز عند فشل الإرسال ليُعاد المحاولة لاحقاً", async () => {
    vi.mocked(repo.claimConfirmationEmail).mockResolvedValue(true);
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "boom" });
    const res = await sendOrderConfirmationEmail("o1");
    expect(res.sent).toBe(false);
    expect(repo.revertConfirmationEmailClaim).toHaveBeenCalledWith("o1");
  });

  it("لا يرسل لطلب غير مدفوع", async () => {
    vi.mocked(repo.findOrderForEmail).mockResolvedValue({ ...baseOrder, paymentStatus: "UNPAID" } as never);
    const res = await sendOrderConfirmationEmail("o1");
    expect(res.reason).toBe("NOT_PAID");
    expect(repo.claimConfirmationEmail).not.toHaveBeenCalled();
  });
});