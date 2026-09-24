import { pingDatabase } from "./health.repository";

export type HealthReport = {
  status: "ok" | "degraded";
  checks: {
    database: "up" | "down";
  };
  latencyMs: number;
  timestamp: string;
};

/** مهلة كافية لتحمّل "البدء البارد" (cold start) في Neon دون أن يعلّق الفحص. */
const DB_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DB_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * يبني تقرير صحة النظام لأدوات المراقبة (UptimeRobot وغيرها).
 * لا يكشف أي تفاصيل داخلية: فقط up/down وزمن الاستجابة.
 */
export async function getHealthReport(): Promise<HealthReport> {
  const startedAt = Date.now();
  let database: "up" | "down" = "down";

  try {
    await withTimeout(pingDatabase(), DB_TIMEOUT_MS);
    database = "up";
  } catch (error) {
    // التفاصيل تذهب إلى الـ Logs فقط ولا تُعاد للعميل
    console.error(
      "[health] database check failed:",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    status: database === "up" ? "ok" : "degraded",
    checks: { database },
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };
}