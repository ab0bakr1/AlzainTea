// src/components/checkout/CheckoutView.tsx
// واجهة إتمام الشراء: العنوان ← الشحن والخصم ← الدفع ← المراجعة.
// كل الأرقام النهائية (أسعار، ضريبة، شحن، خصم، مخزون) يعيد الخادم احتسابها في POST /api/checkout/session؛
// ما يُعرض هنا تقدير للعميل فقط.

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Check, Info, Lock, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCountry } from "@/hooks/useCountry";
import { makeMoney } from "@/lib/checkout-money";
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
import StepHeading from "@/components/checkout/StepHeading";
import VatField from "@/components/checkout/VatField";
import { countryLabel } from "@/components/checkout/checkout-utils";
import { saveTrackingToken } from "@/services/order-result.service";

const STEP_KEYS = ["address", "shipping", "payment", "review"] as const;

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
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const tCart = useTranslations("cart");
  const locale = useLocale();

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
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
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
      setCouponError(parseApiError(e, t("errors.couponVerify")).message);
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
      if (!result.checkoutUrl) throw new Error(t("errors.noCheckoutUrl"));
      // نحفظ رمز التتبع قبل مغادرة الصفحة: روابط العودة من البوابات لا تحمله
      if (result.orderId && result.trackingToken) {
        saveTrackingToken(result.orderId, result.trackingToken);
      }
      // لا نُفرغ السلة هنا: ...
      window.location.assign(result.checkoutUrl);
      return; // يبقى القفل مفعلاً أثناء الانتقال
    } catch (e) {
      const err = parseApiError(e, t("errors.orderFailed"));

      if (err.code === "CART_INVALID" || err.code === "OUT_OF_STOCK") {
        try {
          await validateCart();
        } catch {
          /* نكتفي برسالة الخادم */
        }
        setCartNotice(t("cartChanged"));
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
      <main className="bg-[var(--color-bg-alt)]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8" aria-busy="true">
          <div className="mb-6 h-10 w-56 animate-pulse rounded bg-[var(--color-form)]" />
          <div className="h-72 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-form)]" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="ds-bg-dune">
        <div className="mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <span
            aria-hidden
            className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-accent-text)] shadow-[var(--shadow-sm)]"
          >
            <ShoppingBag size={34} />
          </span>
          <h1 className="ds-font-heading mt-8 text-3xl font-bold md:text-4xl">{tCart("emptyTitle")}</h1>
          <p className="mx-auto mt-4 max-w-md leading-8 text-[var(--color-text-secondary)]">
            {tCart("emptyHint")}
          </p>
          <Link href="/products" className="ds-btn ds-btn-primary mt-9 px-8">
            {tCart("browseProducts")}
          </Link>
        </div>
      </main>
    );
  }

  const countryName = countryLabel(countryCode, locale);
  const etaRaw = shippingQuery.data?.estimatedDays ?? country?.estimatedDays;
  const issueMessages = (validationIssues ?? [])
    .map((i) => (i as { message?: string }).message)
    .filter((m): m is string => !!m);
  const lastStep = STEP_KEYS.length - 1;

  return (
    <main className="bg-[var(--color-bg-alt)] text-[var(--color-text-primary)]">
      <style>{`
        .co-hero{
          background:linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
          color:#f0e6d3;
          border-bottom:1px solid rgba(201,164,92,.25);
        }
      `}</style>

      {/* الرأس الداكن + مؤشر الخطوات */}
      <div className="co-hero">
        <div className="mx-auto max-w-7xl px-5 pb-8 pt-10 md:px-8 md:pb-12 md:pt-14">
          <h1 className="ds-font-heading text-3xl font-extrabold leading-[1.2] text-[#f0e6d3] md:text-5xl">
            {t("title")}
          </h1>

          <nav aria-label={t("stepsLabel")} className="mt-8 md:mt-10">
            <ol className="flex items-center">
              {STEP_KEYS.map((key, i) => {
                const done = i < step;
                const current = i === step;
                return (
                  <li
                    key={key}
                    aria-current={current ? "step" : undefined}
                    className={`flex items-center ${i < lastStep ? "flex-1" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={!done}
                      onClick={() => setStep(i)}
                      className="flex items-center gap-3 disabled:cursor-default"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold tabular-nums transition-[box-shadow,background-color] duration-200 ${
                          done
                            ? "border-transparent bg-[var(--brand-gold)] text-[#0f0d0a]"
                            : current
                              ? "border-transparent bg-[var(--brand-gold)] text-[#0f0d0a] ring-4 ring-[rgba(201,164,92,0.3)]"
                              : "border-[#f0e6d3]/25 text-[#c4b49e]"
                        }`}
                      >
                        {done ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}
                      </span>
                      <span
                        className={`text-sm md:text-base ${
                          current
                            ? "font-semibold text-[#f0e6d3]"
                            : done
                              ? "hidden text-[#f0e6d3]/85 sm:inline"
                              : "hidden text-[#c4b49e] sm:inline"
                        }`}
                      >
                        {t(`steps.${key}`)}
                      </span>
                    </button>
                    {i < lastStep && (
                      <span
                        aria-hidden
                        className={`mx-3 h-px flex-1 md:mx-5 ${
                          done ? "bg-[var(--brand-gold)]" : "bg-[#f0e6d3]/15"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        {(cartNotice || issueMessages.length > 0) && (
          <div
            role="status"
            className="mb-8 flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] p-4 text-sm"
          >
            <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" aria-hidden />
            <div className="space-y-1">
              {cartNotice && <p className="font-medium">{cartNotice}</p>}
              {issueMessages.map((m, i) => (
                <p key={i} className="text-[var(--color-text-secondary)]">
                  {m}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2">
            <div className="rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-xs)] md:p-8">
              <div className="space-y-6">
                {step === 0 && (
                  <>
                    {!isAuth && (
                      <p className="rounded-[var(--radius-lg)] bg-[var(--color-bg-alt)] p-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                        {t.rich("guestPrompt", {
                          login: (chunks) => (
                            <Link
                              href="/login?callbackUrl=/checkout"
                              className="font-semibold text-[var(--color-text-primary)] underline underline-offset-4"
                            >
                              {chunks}
                            </Link>
                          ),
                        })}
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
                    <StepHeading id="shipping-heading">{t("steps.shipping")}</StepHeading>
                    <ShippingCalculator
                      countryName={countryName}
                      costLabel={money.format(shippingC)}
                      estimatedDays={etaRaw}
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
                  <section className="space-y-4" aria-labelledby="review-heading">
                    <div className="pb-2">
                      <StepHeading id="review-heading">{t("reviewTitle")}</StepHeading>
                    </div>

                    <ReviewRow label={t("review.shipTo")} editLabel={tc("edit")} onEdit={() => setStep(0)}>
                      {isAuth && selectedAddress ? (
                        <>
                          {selectedAddress.fullName} — {selectedAddress.street}، {selectedAddress.city}،{" "}
                          {countryLabel(selectedAddress.country, locale)}
                        </>
                      ) : (
                        <>
                          {guest.fullName} — {guest.street}، {guest.city}، {countryName}
                          <br />
                          <span dir="ltr">{guest.email}</span>
                        </>
                      )}
                    </ReviewRow>

                    <ReviewRow label={t("review.shipping")} editLabel={tc("edit")} onEdit={() => setStep(1)}>
                      {money.format(shippingC)}
                      {etaRaw && ` — ${etaRaw}`}
                    </ReviewRow>

                    <ReviewRow label={t("review.coupon")} editLabel={tc("edit")} onEdit={() => setStep(1)}>
                      {coupon ? `${coupon.code} (−${money.format(discountC)})` : t("review.none")}
                    </ReviewRow>

                    <ReviewRow label={t("review.payment")} editLabel={tc("edit")} onEdit={() => setStep(2)}>
                      {isGulf
                        ? t("review.gatewayLocal", { currency: money.currency })
                        : t("review.cardIntl")}
                      {vat.trim() && (
                        <>
                          <br />
                          {t("vat.label")}: <span dir="ltr">{vat.trim()}</span>
                        </>
                      )}
                    </ReviewRow>

                    {submitError && (
                      <p
                        role="alert"
                        className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-4 text-sm font-medium text-[var(--color-danger)]"
                      >
                        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
                        <span>{submitError}</span>
                      </p>
                    )}
                  </section>
                )}
              </div>

              {/* التنقل */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-6">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0 || submitting}
                  className="ds-btn ds-btn-outline px-6 disabled:invisible"
                >
                  {tc("back")}
                </button>

                {step < STEP_KEYS.length - 1 ? (
                  <button type="button" onClick={goNext} className="ds-btn ds-btn-primary px-8">
                    {tc("next")}
                    <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="ds-btn ds-btn-primary min-h-[52px] px-8 text-base disabled:opacity-60"
                  >
                    <Lock size={18} aria-hidden />
                    {submitting ? t("redirecting") : t("pay", { amount: money.format(totalC) })}
                  </button>
                )}
              </div>
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
    </main>
  );
}

function ReviewRow({
  label,
  editLabel,
  onEdit,
  children,
}: {
  label: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--border-color)] bg-[var(--color-bg-alt)] p-5 text-sm">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
        <p className="font-medium leading-7">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="ds-btn ds-btn-ghost shrink-0 px-4 text-sm">
        {editLabel}
      </button>
    </div>
  );
}