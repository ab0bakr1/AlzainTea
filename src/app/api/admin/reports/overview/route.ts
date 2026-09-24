import { NextRequest } from "next/server";
import { fail, ok, validationError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/require-admin";
import { overviewQuerySchema } from "@/modules/reports/report.validators";
import { getOverview } from "@/modules/reports/report.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = overviewQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return validationError(parsed.error.message);

    return ok(await getOverview(parsed.data.days));
  } catch (error) {
    return fail(error);
  }
}