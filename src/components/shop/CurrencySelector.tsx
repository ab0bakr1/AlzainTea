// src/components/shop/CurrencySelector.tsx
// اختيار العملة — SAR / OMR / AED / USD

'use client'

import { EXCHANGE_RATES } from '@/lib/currency'
import { getCurrencySymbol } from '@/lib/currency'

type CurrencySelectorProps = {
  value: string
  onChange: (currency: string) => void
}

const SUPPORTED_CURRENCIES = ['USD', 'SAR', 'OMR', 'AED', 'KWD', 'GBP', 'EUR'] as const

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-sm border rounded-lg px-2 py-1 cursor-pointer"
      aria-label="اختر العملة"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {getCurrencySymbol(currency)} {currency}
        </option>
      ))}
    </select>
  )
}
