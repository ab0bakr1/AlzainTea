// src/components/checkout/ShippingCalculator.tsx
// حاسبة الشحن حسب الدولة

'use client'

import { useCountry } from '@/hooks/useCountry'
import { formatPrice } from '@/lib/currency'

export default function ShippingCalculator() {
  const { country, shippingRate, currency } = useCountry()

  if (!country) return null

  return (
    <div className="p-4 rounded-xl border bg-muted/30">
      <h3 className="font-semibold mb-3">تفاصيل الشحن</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">الدولة</span>
          <span>{country.nameAr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">تكلفة الشحن</span>
          <span className="font-medium">{formatPrice(shippingRate, 'USD')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">المدة المتوقعة</span>
          <span>{country.estimatedDays}</span>
        </div>
      </div>
    </div>
  )
}
