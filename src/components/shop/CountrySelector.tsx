// src/components/shop/CountrySelector.tsx
// اختيار الدولة — يحدد بوابة الدفع + العملة + الشحن

'use client'

import { useCountry } from '@/hooks/useCountry'

export default function CountrySelector() {
  const { countryCode, updateCountry, availableCountries } = useCountry()

  return (
    <select
      value={countryCode}
      onChange={(e) => updateCountry(e.target.value)}
      className="bg-transparent text-sm border rounded-lg px-2 py-1 cursor-pointer"
      aria-label="اختر دولتك"
    >
      {availableCountries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.nameAr}
        </option>
      ))}
    </select>
  )
}
