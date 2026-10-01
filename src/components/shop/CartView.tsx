// src/components/shop/CartView.tsx
// واجهة صفحة السلة: عناصر السلة + التحقق الخادمي + حاسبة الشحن + ملخص الطلب.
// القراءة والتعديل عبر useCart فقط (بدون استيراد المخزن مباشرة).

'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useCountry } from '@/hooks/useCountry'
import { convertPrice } from '@/lib/currency'
import { formatMoney } from '@/lib/order-format'
import type { CartItem, CartValidationIssue } from '@/types/cart'

/* ────────────────────────────── النصوص ────────────────────────────── */

const AR = {
  title: 'سلة التسوق',
  items: (n: number) =>
    n === 1 ? 'منتج واحد' : n === 2 ? 'منتجان' : n <= 10 ? `${n} منتجات` : `${n} منتجًا`,
  emptyTitle: 'سلتك فارغة',
  emptyHint: 'لم تضف أي منتج بعد. تصفّح مجموعتنا من الشاي الفاخر.',
  browse: 'تصفّح المنتجات',
  continueShopping: 'متابعة التسوق',
  clear: 'إفراغ السلة',
  clearConfirm: 'هل تريد حذف جميع المنتجات من السلة؟',
  remove: 'حذف',
  decrease: 'إنقاص الكمية',
  increase: 'زيادة الكمية',
  maxQty: (n: number) => `الحد الأقصى المتاح: ${n}`,
  unavailable: 'غير متوفر حاليًا',
  summary: 'ملخص الطلب',
  shipTo: 'الشحن إلى',
  subtotal: 'المجموع الفرعي',
  shipping: 'الشحن',
  shippingDays: (d: string) => `التوصيل خلال ${d} أيام`,
  shippingLoading: 'جارٍ الحساب…',
  shippingError: 'تعذّر حساب الشحن الآن، سيُحسب عند الدفع.',
  shippingRetry: 'إعادة المحاولة',
  shippingNA: 'الشحن غير متوفر لهذه الدولة حاليًا. اختر دولة أخرى.',
  total: 'الإجمالي التقديري',
  taxNote:
    'الضريبة والخصومات (إن وُجدت) تُحتسب عند إتمام الشراء، وقد يختلف المبلغ النهائي قليلًا عن التقدير.',
  checkout: 'إتمام الشراء',
  checking: 'جارٍ التحقق من التوفر…',
  issuesTitle: 'تم تحديث سلتك',
  issuesHint: 'راجع التغييرات ثم اضغط «إتمام الشراء» للمتابعة.',
  dismiss: 'إخفاء',
  validateFailed: 'تعذّر التحقق من السلة. تحقق من اتصالك ثم أعد المحاولة.',
  retry: 'إعادة المحاولة',
  issueMessages: {
    OUT_OF_STOCK: 'نفدت الكمية',
    PRICE_CHANGED: 'تغيّر السعر',
    PRODUCT_UNAVAILABLE: 'المنتج غير متاح',
    QUANTITY_CAPPED: 'تم تعديل الكمية',
  } as Record<CartValidationIssue['type'], string>,
}

const EN: typeof AR = {
  title: 'Shopping cart',
  items: (n) => (n === 1 ? '1 item' : `${n} items`),
  emptyTitle: 'Your cart is empty',
  emptyHint: "You haven't added anything yet. Browse our premium teas.",
  browse: 'Browse products',
  continueShopping: 'Continue shopping',
  clear: 'Clear cart',
  clearConfirm: 'Remove all items from your cart?',
  remove: 'Remove',
  decrease: 'Decrease quantity',
  increase: 'Increase quantity',
  maxQty: (n) => `Maximum available: ${n}`,
  unavailable: 'Currently unavailable',
  summary: 'Order summary',
  shipTo: 'Ship to',
  subtotal: 'Subtotal',
  shipping: 'Shipping',
  shippingDays: (d) => `Delivery in ${d} days`,
  shippingLoading: 'Calculating…',
  shippingError: "Couldn't calculate shipping right now. It will be calculated at checkout.",
  shippingRetry: 'Try again',
  shippingNA: 'Shipping is not available to this country yet. Choose another one.',
  total: 'Estimated total',
  taxNote:
    'Tax and discounts (if any) are applied at checkout. The final amount may differ slightly from this estimate.',
  checkout: 'Proceed to checkout',
  checking: 'Checking availability…',
  issuesTitle: 'Your cart was updated',
  issuesHint: 'Review the changes, then press "Proceed to checkout" to continue.',
  dismiss: 'Dismiss',
  validateFailed: "We couldn't verify your cart. Check your connection and try again.",
  retry: 'Try again',
  issueMessages: {
    OUT_OF_STOCK: 'Out of stock',
    PRICE_CHANGED: 'Price changed',
    PRODUCT_UNAVAILABLE: 'Product unavailable',
    QUANTITY_CAPPED: 'Quantity adjusted',
  },
}

/* ────────────────────────────── أدوات مساعدة ────────────────────────────── */

const MAX_LINE_QTY = 99 // مطابق لـ cartLineSchema في cart.validators.ts
const THREE_DECIMAL = ['KWD', 'BHD', 'OMR']
const BLOCKING_TYPES: CartValidationIssue['type'][] = ['OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE']

const lineKey = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ''}`

function roundFor(amount: number, currency: string) {
  return Number(amount.toFixed(THREE_DECIMAL.includes(currency) ? 3 : 2))
}

/** تحويل بند من USD إلى عملة العرض (تقديري — المصدر النهائي هو الخادم عند الدفع). */
function lineTotalLocal(item: CartItem, currency: string) {
  return roundFor(convertPrice(item.price * item.quantity, currency), currency)
}

type ShippingState =
  | { status: 'loading' }
  | { status: 'ready'; costUsd: number; days: string | null }
  | { status: 'unavailable' }
  | { status: 'error' }

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

function pickDays(obj: Record<string, unknown>): string | null {
  for (const k of ['estimatedDays', 'days', 'deliveryDays', 'eta']) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim() !== '') return v
    if (typeof v === 'number') return String(v)
  }
  return null
}

/** يحوّل استجابة /api/shipping/calculate إلى شكل ثابت. (النقطة الوحيدة المرتبطة بشكل ShippingRate) */
function normalizeShipping(data: unknown, fallbackCostUsd: number): ShippingState {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const cost = pickNumber(obj, ['cost', 'rate', 'price', 'amount', 'shippingCost'])
  return { status: 'ready', costUsd: cost ?? fallbackCostUsd, days: pickDays(obj) }
}

const noopSubscribe = () => () => {}

/* ────────────────────────────── المكوّن الرئيسي ────────────────────────────── */

export default function CartView() {
  const locale = useLocale()
  const t = locale === 'ar' ? AR : EN
  const numberLocale = locale === 'ar' ? 'ar-SA' : 'en-US'
  const router = useRouter()

  const { items, totalItems, isValidating, validationIssues, removeItem, updateQuantity, clearCart, validateCart } =
    useCart()
  const { countryCode, country, currency, shippingRate, updateCountry, availableCountries } = useCountry()

  // السلة تُستعاد من localStorage بعد الـ mount، لذلك نعرض هيكلًا مؤقتًا قبل ذلك.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  const [validateError, setValidateError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [shipping, setShipping] = useState<ShippingState>({ status: 'loading' })
  const [shippingAttempt, setShippingAttempt] = useState(0)
  const issuesRef = useRef<HTMLDivElement>(null)
  const didInitialValidate = useRef(false)

  /* التحقق الخادمي مرة واحدة عند فتح الصفحة (أول ظهور لعناصر في السلة) */
  useEffect(() => {
    if (!mounted || didInitialValidate.current || items.length === 0) return
    didInitialValidate.current = true
    validateCart().catch((e: unknown) =>
      setValidateError(e instanceof Error ? e.message : t.validateFailed)
    )
  }, [mounted, items.length, validateCart, t.validateFailed])

  /* حساب الشحن عند تغيّر الدولة */
  useEffect(() => {
    if (!mounted || !country) return
    const ctrl = new AbortController()
    setShipping({ status: 'loading' })

    fetch(`/api/shipping/calculate?country=${encodeURIComponent(countryCode)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) {
          setShipping(normalizeShipping(json.data, shippingRate))
        } else if (json?.error?.code === 'SHIPPING_NOT_AVAILABLE' || json?.error?.code === 'VALIDATION_ERROR') {
          setShipping({ status: 'unavailable' })
        } else {
          setShipping({ status: 'error' })
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setShipping({ status: 'error' })
      })

    return () => ctrl.abort()
    // shippingRate مستثنى عمدًا: هو قيمة احتياطية فقط ولا يجب أن يعيد الطلب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, country, countryCode, shippingAttempt])

  /* المشاكل المعروضة: فقط ما يخص عناصر ما زالت في السلة ولم يُخفِها العميل */
  const cartKeys = new Set(items.map((i) => lineKey(i.productId, i.variantId)))
  const visibleIssues = validationIssues.filter(
    (i) =>
      cartKeys.has(lineKey(i.productId, i.variantId)) &&
      !dismissed.has(`${lineKey(i.productId, i.variantId)}:${i.type}`)
  )
  const blockedKeys = new Set(
    validationIssues
      .filter((i) => BLOCKING_TYPES.includes(i.type))
      .map((i) => lineKey(i.productId, i.variantId))
  )

  /* الأرقام */
  const subtotal = items.reduce((sum, i) => sum + lineTotalLocal(i, currency), 0)
  const shippingLocal =
    shipping.status === 'ready' ? roundFor(convertPrice(shipping.costUsd, currency), currency) : null
  const total = subtotal + (shippingLocal ?? 0)
  const money = (v: number) => formatMoney(v, currency, numberLocale)

  async function handleCheckout() {
    setValidateError(null)
    try {
      const result = await validateCart()
      if (result.valid && result.issues.length === 0) {
        router.push('/checkout')
        return
      }
      // يوجد تعديلات: نبقي العميل ليراجعها قبل المتابعة
      setDismissed(new Set())
      requestAnimationFrame(() =>
        issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      )
    } catch (e) {
      setValidateError(e instanceof Error ? e.message : t.validateFailed)
    }
  }

  function handleClear() {
    if (window.confirm(t.clearConfirm)) clearCart()
  }

  /* ───────── الحالات ───────── */

  if (!mounted) return <CartSkeleton />

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">{t.emptyTitle}</h1>
          <p className="text-muted-foreground">{t.emptyHint}</p>
          <Link
            href="/products"
            className="mt-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t.browse}
          </Link>
        </div>
      </div>
    )
  }

  const checkoutDisabled = isValidating || shipping.status === 'unavailable'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.items(totalItems)}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ───── العناصر ───── */}
        <section aria-label={t.title} className="space-y-4">
          {validateError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                {validateError}
              </span>
              <button
                type="button"
                onClick={() => {
                  setValidateError(null)
                  validateCart().catch((e: unknown) =>
                    setValidateError(e instanceof Error ? e.message : t.validateFailed)
                  )
                }}
                className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                {t.retry}
              </button>
            </div>
          )}

          {visibleIssues.length > 0 && (
            <div
              ref={issuesRef}
              role="status"
              aria-live="polite"
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
            >
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                {t.issuesTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t.issuesHint}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {visibleIssues.map((issue) => {
                  const line = items.find(
                    (i) => lineKey(i.productId, i.variantId) === lineKey(issue.productId, issue.variantId)
                  )
                  const name = line ? (locale === 'ar' ? line.nameAr : line.nameEn) : ''
                  const key = `${lineKey(issue.productId, issue.variantId)}:${issue.type}`
                  return (
                    <li key={key} className="flex items-start justify-between gap-3">
                      <span>
                        <strong className="font-medium">{name}</strong>
                        {' — '}
                        {locale === 'ar' && issue.message ? issue.message : t.issueMessages[issue.type]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t.dismiss}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <ul className="space-y-3">
            {items.map((item) => (
              <CartLine
                key={lineKey(item.productId, item.variantId)}
                item={item}
                locale={locale}
                t={t}
                blocked={blockedKeys.has(lineKey(item.productId, item.variantId))}
                unitText={money(roundFor(convertPrice(item.price, currency), currency))}
                totalText={money(lineTotalLocal(item, currency))}
                onQuantity={(q) => updateQuantity(item.productId, q, item.variantId)}
                onRemove={() => removeItem(item.productId, item.variantId)}
              />
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
            <Link href="/products" className="font-medium text-primary underline-offset-4 hover:underline">
              {t.continueShopping}
            </Link>
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              {t.clear}
            </button>
          </div>
        </section>

        {/* ───── الملخص ───── */}
        <aside
          aria-label={t.summary}
          className="h-fit space-y-5 rounded-2xl border bg-background p-5 lg:sticky lg:top-24"
        >
          <h2 className="text-lg font-bold">{t.summary}</h2>

          <div className="space-y-1.5">
            <label htmlFor="cart-country" className="text-sm text-muted-foreground">
              {t.shipTo}
            </label>
            <select
              id="cart-country"
              value={countryCode}
              onChange={(e) => updateCountry(e.target.value)}
              className="w-full cursor-pointer rounded-lg border bg-transparent px-3 py-2 text-sm"
            >
              {availableCountries.map((c: { code: string; nameAr: string; nameEn: string }) => (
                <option key={c.code} value={c.code}>
                  {locale === 'ar' ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t.subtotal}</dt>
              <dd className="font-medium">{money(subtotal)}</dd>
            </div>

            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-4 w-4" aria-hidden />
                {t.shipping}
              </dt>
              <dd className="text-end font-medium">
                {shipping.status === 'loading' && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t.shippingLoading}
                  </span>
                )}
                {shipping.status === 'ready' && (
                  <>
                    {money(shippingLocal ?? 0)}
                    {shipping.days && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t.shippingDays(shipping.days)}
                      </span>
                    )}
                  </>
                )}
                {shipping.status === 'error' && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t.shippingError}{' '}
                    <button
                      type="button"
                      onClick={() => setShippingAttempt((n) => n + 1)}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t.shippingRetry}
                    </button>
                  </span>
                )}
                {shipping.status === 'unavailable' && (
                  <span role="alert" className="block text-xs font-normal text-destructive">
                    {t.shippingNA}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between border-t pt-4 text-base font-bold">
            <span>{t.total}</span>
            <span>{money(total)}</span>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{t.taxNote}</p>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t.checking}
              </>
            ) : (
              t.checkout
            )}
          </button>
        </aside>
      </div>
    </div>
  )
}

/* ────────────────────────────── بند السلة ────────────────────────────── */

interface CartLineProps {
  item: CartItem
  locale: string
  t: typeof AR
  blocked: boolean
  unitText: string
  totalText: string
  onQuantity: (quantity: number) => void
  onRemove: () => void
}

function CartLine({ item, locale, t, blocked, unitText, totalText, onQuantity, onRemove }: CartLineProps) {
  const name = locale === 'ar' ? item.nameAr : item.nameEn
  const maxQty = Math.min(MAX_LINE_QTY, item.knownStock ?? MAX_LINE_QTY)
  const atMax = item.quantity >= maxQty

  return (
    <li
      className={`flex gap-4 rounded-2xl border p-4 ${
        blocked ? 'border-destructive/50 bg-destructive/5' : 'bg-background'
      }`}
    >
      <Link
        href={`/products/${item.slug}`}
        className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
        aria-label={name}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-6 w-6" aria-hidden />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${item.slug}`}
              className="line-clamp-2 font-medium leading-snug hover:text-primary"
            >
              {name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{unitText}</p>
            {blocked && <p className="mt-1 text-xs font-medium text-destructive">{t.unavailable}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${t.remove}: ${name}`}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full border">
            <button
              type="button"
              onClick={() => onQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label={t.decrease}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(item.quantity + 1)}
              disabled={atMax}
              aria-label={t.increase}
              title={atMax ? t.maxQty(maxQty) : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <span className="font-bold tabular-nums">{totalText}</span>
        </div>
        {atMax && item.knownStock !== undefined && item.knownStock < MAX_LINE_QTY && (
          <p className="text-xs text-muted-foreground">{t.maxQty(maxQty)}</p>
        )}
      </div>
    </li>
  )
}

/* ────────────────────────────── هيكل التحميل ────────────────────────────── */

function CartSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8" aria-busy="true">
      <div className="mb-6 h-9 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  )
}