import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../health.repository", () => ({
  pingDatabase: vi.fn(),
}));

import { pingDatabase } from "../health.repository";
import { getHealthReport } from "../health.service";

const pingMock = vi.mocked(pingDatabase);

describe("getHealthReport", () => {
  beforeEach(() => {
    pingMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("يرجع ok عندما تنجح قاعدة البيانات", async () => {
    pingMock.mockResolvedValue(undefined);

    const report = await getHealthReport();

    expect(report.status).toBe("ok");
    expect(report.checks.database).toBe("up");
    expect(report.latencyMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(report.timestamp))).toBe(false);
  });

  it("يرجع degraded عندما تفشل قاعدة البيانات دون تسريب رسالة الخطأ", async () => {
    pingMock.mockRejectedValue(new Error("connection refused: secret-host"));

    const report = await getHealthReport();

    expect(report.status).toBe("degraded");
    expect(report.checks.database).toBe("down");
    expect(JSON.stringify(report)).not.toContain("secret-host");
  });

  it("يرجع degraded عند تجاوز المهلة", async () => {
    vi.useFakeTimers();
    pingMock.mockReturnValue(new Promise<void>(() => {})); // لا يكتمل أبداً

    const pending = getHealthReport();
    await vi.advanceTimersByTimeAsync(5_001);
    const report = await pending;

    expect(report.status).toBe("degraded");
    expect(report.checks.database).toBe("down");
  });
});