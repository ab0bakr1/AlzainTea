// src/hooks/useCountry.ts
// Hook لإدارة اختيار الدولة + العملة + بوابة الدفع

'use client'

import { useState, useEffect } from 'react'
import { getCountryByCode, getPaymentGateway, SHIPPING_COUNTRIES } from '@/lib/shipping-rates'
import type { ShippingCountry } from '@/lib/shipping-rates'

const COUNTRY_COOKIE = 'preferred_country'

export function useCountry() {
  const [countryCode, setCountryCode] = useState<string>('SA')
  const [country, setCountry] = useState<ShippingCountry | undefined>()

  useEffect(() => {
    // قراءة الدولة المحفوظة من localStorage
    const saved = localStorage.getItem(COUNTRY_COOKIE) ?? 'SA'
    updateCountry(saved)
  }, [])

  function updateCountry(code: string) {
    setCountryCode(code)
    setCountry(getCountryByCode(code))
    localStorage.setItem(COUNTRY_COOKIE, code)
  }

  return {
    countryCode,
    country,
    currency: country?.currency ?? 'USD',
    paymentGateway: getPaymentGateway(countryCode),
    shippingRate: country?.rate ?? 25,
    isGulf: country?.gateway === 'local',
    updateCountry,
    availableCountries: SHIPPING_COUNTRIES,
  }
}
