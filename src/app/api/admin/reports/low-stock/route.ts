import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { lowStockQuerySchema } from "@/modules/reports/report.validators";
import { getLowStock } from "@/modules/reports/report.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = lowStockQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await getLowStock(parsed.data.threshold));
  } catch (error) {
    return fail(error);
  }
}