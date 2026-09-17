// src/lib/payment-gateway.ts
// إعداد بوابة الدفع المحلية (Tap أو Moyasar)
// غيّر PAYMENT_PROVIDER في .env لاختيار البوابة

const PROVIDER = process.env.PAYMENT_PROVIDER ?? 'tap' // 'tap' | 'moyasar'
const API_KEY = process.env.LOCAL_GATEWAY_API_KEY ?? ''

if (!API_KEY) {
  console.warn('⚠️  LOCAL_GATEWAY_API_KEY غير محددة — الدفع المحلي لن يعمل')
}

// ─── إنشاء جلسة دفع ──────────────────────────────────────────
export async function createPaymentSession(params: {
  amount: number        // بالهللة/فلس (أصغر وحدة)
  currency: string      // 'SAR' | 'OMR' | 'AED'
  orderId: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
}) {
  if (PROVIDER === 'tap') {
    return createTapCharge(params)
  }
  return createMoyasarPayment(params)
}

// ─── Tap Payments ─────────────────────────────────────────────
async function createTapCharge(params: Parameters<typeof createPaymentSession>[0]) {
  const res = await fetch('https://api.tap.company/v2/charges', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount / 100,
      currency: params.currency,
      customer: { email: params.customerEmail },
      source: { id: 'src_all' },
      redirect: { url: params.successUrl },
      metadata: { orderId: params.orderId },
    }),
  })
  return res.json()
}

// ─── Moyasar ──────────────────────────────────────────────────
async function createMoyasarPayment(params: Parameters<typeof createPaymentSession>[0]) {
  const res = await fetch('https://api.moyasar.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      description: `طلب رقم ${params.orderId}`,
      callback_url: params.successUrl,
      source: { type: 'creditcard' },
      metadata: { orderId: params.orderId },
    }),
  })
  return res.json()
}
