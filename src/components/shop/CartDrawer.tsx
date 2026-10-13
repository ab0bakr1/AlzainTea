// src/components/shop/CartDrawer.tsx
// درج السلة الجانبي

'use client'

import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/currency'
import Link from 'next/link'

type CartDrawerProps = {
  isOpen: boolean
  onClose: () => void
  currency?: string
}

export default function CartDrawer({ isOpen, onClose, currency = 'USD' }: CartDrawerProps) {
  const { items, totalItems, subtotal, removeItem, updateQuantity } = useCart()
  const isEmpty = totalItems === 0

  const handleDecrease = (productId: string, variantId: string | null | undefined, quantity: number) => {
    if (quantity <= 1) {
      removeItem(productId, variantId)
      return
    }
    updateQuantity(productId, quantity - 1, variantId)
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

      {/* Drawer */}
      <div
        className={`fixed top-0 end-0 h-full w-80 bg-background border-s shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">سلة التسوق</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isEmpty ? (
              <p className="text-center text-muted-foreground py-8">السلة فارغة 🍵</p>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.productId}:${item.variantId ?? 'base'}`}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.nameAr}</p>
                    <p className="text-primary text-sm">{formatPrice(item.price, currency)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecrease(item.productId, item.variantId, item.quantity)}
                      className="w-6 h-6 rounded-full border flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      className="w-6 h-6 rounded-full border flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-destructive text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {!isEmpty && (
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-bold">
                <span>الإجمالي</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={onClose}
                className="block w-full py-3 text-center rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                إتمام الشراء
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}