import { describe, expect, it } from "vitest";
import { adminOrdersQuerySchema } from "../order.validators";

describe("adminOrdersQuerySchema", () => {
  it("تاريخ النهاية بدون وقت يشمل اليوم كاملاً", () => {
    const r = adminOrdersQuerySchema.parse({ to: "2026-10-05" });
    expect(r.to?.toISOString()).toBe("2026-10-05T23:59:59.999Z");
  });

  it("تاريخ البداية يبقى بداية اليوم", () => {
    const r = adminOrdersQuerySchema.parse({ from: "2026-10-01" });
    expect(r.from?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("يرفض بداية بعد النهاية", () => {
    const r = adminOrdersQuerySchema.safeParse({ from: "2026-10-10", to: "2026-10-01" });
    expect(r.success).toBe(false);
  });

  it("يرفض تاريخاً غير صالح", () => {
    expect(adminOrdersQuerySchema.safeParse({ from: "abc" }).success).toBe(false);
  });

  it("يحوّل رمز الدولة إلى أحرف كبيرة ويرفض الطول الخاطئ", () => {
    expect(adminOrdersQuerySchema.parse({ country: "sa" }).country).toBe("SA");
    expect(adminOrdersQuerySchema.safeParse({ country: "SAU" }).success).toBe(false);
  });

  it("يطبّق القيم الافتراضية للترقيم", () => {
    const r = adminOrdersQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });
});