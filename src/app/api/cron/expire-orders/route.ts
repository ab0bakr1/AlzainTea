import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { expireStalePendingOrders } from "@/modules/orders/order.service";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(req.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// GET /api/cron/expire-orders — يحرر مخزون الطلبات غير المدفوعة المنتهية
// (Vercel Cron يرسل Authorization: Bearer $CRON_SECRET تلقائياً)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "غير مصرح", statusCode: 401 } },
      { status: 401 }
    );
  }

  const result = await expireStalePendingOrders(60);
  return NextResponse.json({ success: true, data: result });
}