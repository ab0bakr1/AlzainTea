import { z } from "zod";
import { SUPPORTED_COUNTRIES } from "@/lib/shipping-rates";

export const calculateShippingSchema = z.object({
  country: z.enum(SUPPORTED_COUNTRIES as [string, ...string[]], {
    errorMap: () => ({ message: "الدولة المحددة غير مدعومة للشحن حالياً" }),
  }),
});

export type CalculateShippingInput = z.infer<typeof calculateShippingSchema>;