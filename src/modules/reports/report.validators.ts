import { z } from "zod";

export const overviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).max(1000).default(5),
});

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;