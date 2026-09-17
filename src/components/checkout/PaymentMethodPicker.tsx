// src/components/checkout/PaymentMethodPicker.tsx
// يعرض Stripe أو البوابة المحلية حسب الدولة المختارة

'use client'

import { useCountry } from '@/hooks/useCountry'

type PaymentMethodPickerProps = {
  selected: 'stripe' | 'local'
  onChange: (method: 'stripe' | 'local') => void
}

export default function PaymentMethodPicker({ selected, onChange }: PaymentMethodPickerProps) {
  const { isGulf, country } = useCountry()

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">طريقة الدفع</h3>

      {/* بوابة الدفع المحلية (للخليج) */}
      {isGulf && (
        <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            name="payment"
            value="local"
            checked={selected === 'local'}
            onChange={() => onChange('local')}
            className="accent-primary"
          />
          <div>
            <p className="font-medium">بطاقة محلية</p>
            <p className="text-sm text-muted-foreground">
              Tap / Moyasar — {country?.currency}
            </p>
          </div>
          <div className="ms-auto flex gap-1">
            {/* TODO: شعارات Apple Pay + mada + Visa */}
            <span className="text-xs bg-muted px-2 py-1 rounded">Apple Pay</span>
            <span className="text-xs bg-muted px-2 py-1 rounded">mada</span>
          </div>
        </label>
      )}

      {/* Stripe — دولي */}
      <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
        <input
          type="radio"
          name="payment"
          value="stripe"
          checked={selected === 'stripe'}
          onChange={() => onChange('stripe')}
          className="accent-primary"
        />
        <div>
          <p className="font-medium">بطاقة ائتمان دولية</p>
          <p className="text-sm text-muted-foreground">Visa / Mastercard — USD</p>
        </div>
        <div className="ms-auto flex gap-1">
          <span className="text-xs bg-muted px-2 py-1 rounded">Visa</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">Mastercard</span>
        </div>
      </label>
    </div>
  )
}
