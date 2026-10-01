// src/components/checkout/CheckoutView.tsx
// واجهة إتمام الشراء: العنوان ← الشحن والخصم ← الدفع ← المراجعة.
// كل الأرقام النهائية (أسعار، ضريبة، شحن، خصم، مخزون) يعيد الخادم احتسابها في POST /api/checkout/session؛
// ما يُعرض هنا تقدير للعميل فقط.

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/hooks/useCart";
import { useCountry } from "@/hooks/useCountry";
import { makeMoney } from "@/lib/checkout-money";
import { getCountryByCode } from "@/lib/shipping-rates";
import {
  createAddress,
  createCheckoutSession,
  fetchAddresses,
  fetchShippingQuote,
  parseApiError,
  validateCoupon,
} from "@/services/checkout.service";
import type { CheckoutSessionBody, CouponResult, NewAddressInput } from "@/services/checkout.service";
import AddressStep, {
  isSupportedCountry,
  validateGuestForm,
} from "@/components/checkout/AddressStep";
import type { GuestForm } from "@/components/checkout/AddressStep";
import CouponField from "@/components/checkout/CouponField";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentMethodPicker from "@/components/checkout/PaymentMethodPicker";
import ShippingCalculator from "@/components/checkout/ShippingCalculator";
import VatField from "@/components/checkout/VatField";

const STEPS = ["العنوان", "الشحن والخصم", "الدفع", "المراجعة"] as const;

const EMPTY_GUEST: GuestForm = {
  email: "",
  fullName: "",
  phone: "",
  city: "",
  street: "",
  postalCode: "",
};

const noopSubscribe = () => () => {};

export default function CheckoutView() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { status, data: session } = useSession();
  const isAuth = status === "authenticated";
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const { items, subtotal, validateCart, validationIssues } = useCart();
  const { countryCode, country, isGulf, shippingRate, updateCountry } = useCountry();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  // العنوان
  const [guest, setGuest] = useState<GuestForm>(EMPTY_GUEST);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // الكوبون والضريبة
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [vat, setVat] = useState("");

  // الإرسال
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const submitLock = useRef(false);

  // ------------------------------------------------------------------ بيانات الخادم
  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: fetchAddresses,
    enabled: isAuth,
  });
  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);

  const shippingQuery = useQuery({
    queryKey: ["shipping-quote", countryCode],
    queryFn: () => fetchShippingQuote(countryCode),
    enabled: !!country,
    staleTime: 60_000,
  });

  // العنوان المختار: صريح، وإلا الافتراضي، وإلا الأول
  const effectiveId =
    selectedId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
  const selectedAddress = addresses.find((a) => a.id === effectiveId) ?? null;

  // مزامنة دولة الطلب مع دولة العنوان المحفوظ
  useEffect(() => {
    if (
      selectedAddress &&
      selectedAddress.country !== countryCode &&
      isSupportedCountry(selectedAddress.country)
    ) {
      updateCountry(selectedAddress.country);
    }
  }, [selectedAddress, countryCode, updateCountry]);

  // ------------------------------------------------------------------ تحقق السلة عند الدخول (مرة واحدة)
  const validatedRef = useRef(false);
  useEffect(() => {
    if (!mounted || validatedRef.current || items.length === 0) return;
    validatedRef.current = true;
    validateCart().catch((e) => setCartNotice(parseApiError(e).message));
  }, [mounted, items.length, validateCart]);

  // ------------------------------------------------------------------ إعادة فحص الكوبون إذا تغيّر المجموع
  const couponSubtotalRef = useRef(subtotal);
  useEffect(() => {
    if (!coupon || couponSubtotalRef.current === subtotal) return;
    couponSubtotalRef.current = subtotal;
    validateCoupon({ code: coupon.code, subtotal, userId })
      .then(setCoupon)
      .catch((e) => {
        setCoupon(null);
        setCouponError(parseApiError(e).message);
      });
  }, [subtotal, coupon, userId]);

  // ------------------------------------------------------------------ العودة من صفحة الدفع (bfcache)
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        submitLock.current = false;
        setSubmitting(false);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // ------------------------------------------------------------------ المبالغ (تقديرية)
  const money = useMemo(() => makeMoney(countryCode), [countryCode]);
  const shippingUsd = shippingQuery.data?.cost ?? shippingRate;
  const subtotalC = money.toCharge(subtotal);
  const discountC = coupon ? Math.min(money.toCharge(coupon.discount), subtotalC) : 0;
  const shippingC = money.toCharge(shippingUsd);
  const totalC = money.round(subtotalC - discountC + shippingC);
  const formatUsd = (usd: number) => money.format(money.toCharge(usd));

  // ------------------------------------------------------------------ التحقق من كل خطوة
  const guestErrors = !isAuth ? validateGuestForm(guest) : {};
  const stepValid = [
    isAuth
      ? !!selectedAddress && isSupportedCountry(selectedAddress.country)
      : Object.keys(guestErrors).length === 0,
    !shippingQuery.isLoading,
    true,
    true,
  ];

  function goNext() {
    if (!stepValid[step]) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  // ------------------------------------------------------------------ إجراءات
  async function handleAddAddress(input: NewAddressInput) {
    const created = await createAddress(input);
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    setSelectedId(created.id);
  }

  async function applyCoupon(code: string) {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon({ code, subtotal, userId });
      couponSubtotalRef.current = subtotal;
      setCoupon(result);
    } catch (e) {
      setCouponError(parseApiError(e, "تعذّر التحقق من الكوبون").message);
    } finally {
      setCouponLoading(false);
    }
  }

  async function submit() {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const base = {
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? undefined,
        quantity: i.quantity,
      })),
      country: countryCode,
      couponCode: coupon?.code,
      vatNumber: vat.trim() || undefined,
    };

    const body: CheckoutSessionBody = isAuth
      ? { ...base, addressId: effectiveId ?? undefined }
      : {
          ...base,
          guestEmail: guest.email.trim(),
          guestAddress: {
            fullName: guest.fullName.trim(),
            phone: guest.phone.trim(),
            city: guest.city.trim(),
            street: guest.street.trim(),
            postalCode: guest.postalCode.trim() || undefined,
          },
        };

    try {
      const result = await createCheckoutSession(body);
      if (!result.checkoutUrl) throw new Error("تعذّر إنشاء رابط الدفع، حاول مرة أخرى.");
      // لا نُفرغ السلة هنا: تُفرَّغ في صفحة النجاح، وحالة الطلب تُحدَّث عبر الـ Webhook فقط.
      window.location.assign(result.checkoutUrl);
      return; // يبقى القفل مفعلاً أثناء الانتقال
    } catch (e) {
      const err = parseApiError(e, "تعذّر إتمام الطلب");

      if (err.code === "CART_INVALID" || err.code === "OUT_OF_STOCK") {
        try {
          await validateCart();
        } catch {
          /* نكتفي برسالة الخادم */
        }
        setCartNotice("تغيّر سعر أو توفر بعض المنتجات وتم تحديث سلتك. راجع الإجمالي ثم أكمل الطلب.");
        setSubmitError(err.message);
      } else if (err.code?.startsWith("COUPON_")) {
        setCoupon(null);
        setCouponError(err.message);
        setStep(1);
      } else {
        setSubmitError(err.message);
      }
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------ حالات خاصة
  if (!mounted || status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8" aria-busy="true">
        <div className="h-9 w-48 rounded bg-muted animate-pulse mb-6" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">سلتك فارغة</h1>
        <p className="text-muted-foreground">أضف منتجاتك المفضلة أولاً ثم أكمل الشراء.</p>
        <Link
          href="/products"
          className="inline-block px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          تصفّح المنتجات
        </Link>
      </div>
    );
  }

  const countryName = getCountryByCode(countryCode)?.nameAr;
  const issueMessages = (validationIssues ?? [])
    .map((i) => (i as { message?: string }).message)
    .filter((m): m is string => !!m);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">إتمام الشراء</h1>

      {/* مؤشر الخطوات */}
      <ol className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm" aria-label="خطوات الشراء">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <button
                type="button"
                disabled={!done}
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 ${
                  current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full border text-xs ${
                    current || done ? "bg-primary text-primary-foreground border-primary" : ""
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      {(cartNotice || issueMessages.length > 0) && (
        <div role="status" className="mb-6 p-4 rounded-xl border bg-muted/30 text-sm space-y-1">
          {cartNotice && <p>{cartNotice}</p>}
          {issueMessages.map((m, i) => (
            <p key={i} className="text-muted-foreground">
              {m}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {step === 0 && (
            <>
              {!isAuth && (
                <p className="text-sm text-muted-foreground">
                  لديك حساب؟{" "}
                  <Link href="/login?callbackUrl=/checkout" className="underline underline-offset-4">
                    سجّل الدخول
                  </Link>{" "}
                  لاستخدام عناوينك المحفوظة، أو أكمل كزائر.
                </p>
              )}
              <AddressStep
                isAuthenticated={isAuth}
                countryCode={countryCode}
                onCountryChange={updateCountry}
                showErrors={showErrors}
                addresses={addresses}
                addressesLoading={addressesQuery.isLoading}
                addressesError={addressesQuery.isError}
                onRetryAddresses={() => addressesQuery.refetch()}
                selectedId={effectiveId}
                onSelect={setSelectedId}
                onAddAddress={handleAddAddress}
                guest={guest}
                onGuestChange={(p) => setGuest((g) => ({ ...g, ...p }))}
              />
            </>
          )}

          {step === 1 && (
            <section className="space-y-6" aria-labelledby="shipping-heading">
              <h2 id="shipping-heading" className="text-xl font-semibold">
                الشحن والخصم
              </h2>
              <ShippingCalculator
                countryName={countryName}
                costLabel={money.format(shippingC)}
                estimatedDays={shippingQuery.data?.estimatedDays ?? country?.estimatedDays}
                isLoading={shippingQuery.isLoading}
                isEstimate={shippingQuery.isError || shippingQuery.data === null}
                onRetry={() => shippingQuery.refetch()}
              />
              <CouponField
                applied={coupon ? { code: coupon.code, discountLabel: money.format(discountC) } : null}
                loading={couponLoading}
                error={couponError}
                onApply={applyCoupon}
                onRemove={() => {
                  setCoupon(null);
                  setCouponError(null);
                }}
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <PaymentMethodPicker isGulf={isGulf} currency={money.currency} />
              <VatField value={vat} onChange={setVat} />
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5" aria-labelledby="review-heading">
              <h2 id="review-heading" className="text-xl font-semibold">
                مراجعة الطلب
              </h2>

              <ReviewRow label="الشحن إلى" onEdit={() => setStep(0)}>
                {isAuth && selectedAddress ? (
                  <>
                    {selectedAddress.fullName} — {selectedAddress.street}، {selectedAddress.city}،{" "}
                    {getCountryByCode(selectedAddress.country)?.nameAr ?? selectedAddress.country}
                  </>
                ) : (
                  <>
                    {guest.fullName} — {guest.street}، {guest.city}، {countryName}
                    <br />
                    <span dir="ltr">{guest.email}</span>
                  </>
                )}
              </ReviewRow>

              <ReviewRow label="الشحن" onEdit={() => setStep(1)}>
                {money.format(shippingC)}
                {(shippingQuery.data?.estimatedDays ?? country?.estimatedDays) &&
                  ` — ${shippingQuery.data?.estimatedDays ?? country?.estimatedDays}`}
              </ReviewRow>

              <ReviewRow label="الكوبون" onEdit={() => setStep(1)}>
                {coupon ? `${coupon.code} (−${money.format(discountC)})` : "لا يوجد"}
              </ReviewRow>

              <ReviewRow label="الدفع" onEdit={() => setStep(2)}>
                {isGulf ? `بوابة الدفع المحلية — ${money.currency}` : "بطاقة دولية — USD"}
                {vat.trim() && (
                  <>
                    <br />
                    الرقم الضريبي: <span dir="ltr">{vat.trim()}</span>
                  </>
                )}
              </ReviewRow>

              {submitError && (
                <p role="alert" className="p-4 rounded-xl border border-red-300 text-sm text-red-700">
                  {submitError}
                </p>
              )}
            </section>
          )}

          {/* التنقل */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="px-6 py-2 rounded-xl border text-sm disabled:invisible"
            >
              رجوع
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-8 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                متابعة
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-8 py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-60"
              >
                {submitting ? "جارٍ تحويلك للدفع…" : `ادفع ${money.format(totalC)}`}
              </button>
            )}
          </div>
        </div>

        <OrderSummary
          items={items}
          formatUsd={formatUsd}
          currency={money.currency}
          lines={{
            subtotal: money.format(subtotalC),
            discount: coupon ? money.format(discountC) : null,
            shipping: money.format(shippingC),
            total: money.format(totalC),
          }}
        />
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border text-sm">
      <div className="space-y-1">
        <p className="text-muted-foreground">{label}</p>
        <p>{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="underline underline-offset-4 shrink-0">
        تعديل
      </button>
    </div>
  );
}