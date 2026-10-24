// src/components/checkout/VatField.tsx
// حقل الرقم الضريبي (اختياري للعملاء التجاريين).
// تعديل: عند إلغاء التحديد يُفرَّغ الحقل، حتى لا يُرسَل رقم مخفي مع الطلب دون علم العميل.

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type VatFieldProps = {
  value: string
  onChange: (value: string) => void
}

export default function VatField({ value, onChange }: VatFieldProps) {
  const t = useTranslations('checkout')
  const [show, setShow] = useState(value.length > 0)

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--color-bg-alt)] p-5">
      <label className="flex cursor-pointer select-none items-center gap-3">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => {
            setShow(e.target.checked)
            if (!e.target.checked) onChange('')
          }}
          className="size-4 accent-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--color-text-secondary)]">{t('vat.toggle')}</span>
      </label>

      {show && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('vat.placeholder')}
          aria-label={t('vat.label')}
          className="ds-input rounded-[var(--radius-lg)] text-sm"
          dir="ltr"
        />
      )}
    </div>
  )
}