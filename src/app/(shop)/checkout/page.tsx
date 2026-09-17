// src/app/(shop)/checkout/page.tsx
// صفحة الدفع — تحدد الدولة وتختار البوابة المناسبة

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الدفع | الزين للشاي',
}

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">إتمام الشراء</h1>
      {/* 
        TODO:
        1. CountrySelector → يحدد isGulf
        2. ShippingCalculator
        3. PaymentMethodPicker (Stripe أو بوابة محلية حسب الدولة)
        4. VatField (اختياري للشركات)
      */}
    </div>
  )
}
