import { describe, expect, it } from "vitest";
import { buildOrdersCsv, csvCell } from "../orders-csv";
import type { OrderListItem } from "@/services/orders.service";

describe("csvCell", () => {
  it("يهرب علامات الاقتباس والفواصل", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
  });

  it("يمنع Formula Injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("يعالج null وundefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("buildOrdersCsv", () => {
  const row: OrderListItem = {
    id: "ord_1",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    paymentMethod: "tap",
    currency: "SAR",
    total: "115.00",
    country: "SA",
    guestEmail: "g@x.com",
    createdAt: "2026-10-05T10:00:00.000Z",
    user: null,
    _count: { items: 2 },
  };

  it("يبدأ بـ BOM ويحوي صفاً لكل طلب", () => {
    const csv = buildOrdersCsv([row], "ar");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("زائر");
    expect(lines[1]).toContain("مؤكد");
  });
});