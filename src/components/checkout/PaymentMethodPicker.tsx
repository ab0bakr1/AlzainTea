// src/components/checkout/PaymentMethodPicker.tsx
// يعرض وسيلة الدفع التي سيستخدمها الخادم فعلياً.
// التوجيه خادمي بالكامل (resolveGateway): دول الخليج → البوابة المحلية بعملة الدولة، وغيرها → Stripe بالدولار.
// لذلك لا يوجد اختيار هنا: عرض خيار لا يحترمه الخادم يضلّل العميل.

type PaymentMethodPickerProps = {
  isGulf: boolean;
  currency: string;
};

export default function PaymentMethodPicker({ isGulf, currency }: PaymentMethodPickerProps) {
  return (
    <section className="space-y-3" aria-labelledby="payment-heading">
      <h3 id="payment-heading" className="font-semibold text-lg">
        طريقة الدفع
      </h3>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary bg-muted/30">
        <div>
          <p className="font-medium">{isGulf ? "الدفع المحلي الآمن" : "بطاقة ائتمان دولية"}</p>
          <p className="text-sm text-muted-foreground">
            {isGulf
              ? `Apple Pay، mada، وبطاقات Visa / Mastercard — الدفع بعملة ${currency}`
              : "Visa / Mastercard — الدفع بالدولار الأمريكي (USD)"}
          </p>
        </div>
        <div className="ms-auto flex gap-1 shrink-0">
          {(isGulf ? ["Apple Pay", "mada", "Visa"] : ["Visa", "Mastercard"]).map((label) => (
            <span key={label} className="text-xs bg-muted px-2 py-1 rounded">
              {label}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ستنتقل إلى صفحة دفع آمنة لإدخال بيانات البطاقة؛ لا نخزّن بيانات بطاقتك على متجرنا.
      </p>
    </section>
  );
}