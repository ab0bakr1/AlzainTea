// src/components/layout/LanguageSwitcher.tsx
// مكون تبديل اللغة بين العربية والإنجليزية

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  function switchLocale(newLocale: string) {
    // استبدال اللغة الحالية في المسار
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => switchLocale('ar')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          locale === 'ar'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="العربية"
      >
        ع
      </button>
      <span className="text-muted-foreground">/</span>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  )
}
