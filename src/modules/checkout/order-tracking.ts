// src/modules/checkout/order-tracking.ts
// رمز تتبع موقّع (HMAC-SHA256) يتيح للزائر قراءة حالة طلبه فقط، دون حساب.
// الرمز مشتق من orderId بسرّ خادمي، فلا يمكن تخمينه ولا حسابه من الواجهة.

import crypto from "crypto";
import { ApiError } from "@/lib/api-error";

function getSecret(): string {
  const secret = process.env.ORDER_TRACKING_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new ApiError("CONFIG_ERROR", "سر تتبع الطلبات غير مهيأ (ORDER_TRACKING_SECRET)", 500);
  }
  return secret;
}

export function signTrackingToken(orderId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`order-tracking:${orderId}`)
    .digest("base64url");
}

export function verifyTrackingToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(signTrackingToken(orderId));
  const received = Buffer.from(token);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}