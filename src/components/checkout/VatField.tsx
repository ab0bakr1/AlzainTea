// src/components/checkout/VatField.tsx
// حقل الرقم الضريبي (اختياري للعملاء التجاريين).
// تعديل: عند إلغاء التحديد يُفرَّغ الحقل، حتى لا يُرسَل رقم مخفي مع الطلب دون علم العميل.

'use client'

import { useState } from 'react'

type VatFieldProps = {
  value: string
  onChange: (value: string) => void
}

export default function VatField({ value, onChange }: VatFieldProps) {
  const [show, setShow] = useState(value.length > 0)

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => {
            setShow(e.target.checked)
            if (!e.target.checked) onChange('')
          }}
          className="accent-primary"
        />
        <span className="text-sm text-muted-foreground">
          هل أنت مشتري تجاري؟ أضف رقمك الضريبي
        </span>
      </label>

      {show && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="الرقم الضريبي / VAT Number"
          aria-label="الرقم الضريبي"
          className="w-full px-4 py-2 rounded-xl border bg-background text-sm"
          dir="ltr"
        />
      )}
    </div>
  )
}