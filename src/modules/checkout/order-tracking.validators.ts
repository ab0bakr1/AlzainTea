import { z } from "zod";

export const orderTrackingQuerySchema = z.object({
  orderId: z.string().trim().min(1, { error: "معرّف الطلب مطلوب" }).max(50),
  token: z.string().trim().min(20, { error: "رمز التتبع غير صالح" }).max(100),
});

export type OrderTrackingQuery = z.infer<typeof orderTrackingQuerySchema>;