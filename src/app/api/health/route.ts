import { NextResponse } from "next/server";
import { getHealthReport } from "@/modules/health/health.service";

// لا نريد أي تخزين مؤقت لنتيجة الفحص
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * 200 عندما يعمل كل شيء، و 503 عند تعطل قاعدة البيانات.
 * مسار عام عمداً (لأدوات المراقبة) ولا يحتوي على أي بيانات حساسة.
 */
export async function GET() {
  const report = await getHealthReport();
  const healthy = report.status === "ok";

  return NextResponse.json(
    { success: healthy, data: report },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}