// src/app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: جلب تفاصيل الطلب
  return NextResponse.json({ message: 'TODO' })
}

export async function PATCH() {
  // TODO: تحديث حالة الطلب
  return NextResponse.json({ message: 'TODO' })
}
