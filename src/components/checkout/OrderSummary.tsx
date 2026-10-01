// src/components/checkout/OrderSummary.tsx
// ملخص الطلب الجانبي. المبالغ تقديرية وتُحسب نهائياً في الخادم عند إنشاء جلسة الدفع.

import type { CartItem } from "@/types/cart";

// ملاحظة: حقول عرض بند السلة (الاسم/الصورة) معزولة هنا في مكان واحد.
// عدّلها إن كانت أسماء حقول CartItem في مشروعك مختلفة.
function itemDisplay(item: CartItem) {
  const r = item as unknown as Record<string, unknown>;
  const name = (r.nameAr ?? r.name ?? r.title ?? "منتج") as string;
  const image = (r.image ?? (Array.isArray(r.images) ? r.images[0] : undefined)) as string | undefined;
  return { name, image };
}

type OrderSummaryProps = {
  items: CartItem[];
  formatUsd: (usd: number) => string;
  lines: {
    subtotal: string;
    discount: string | null;
    shipping: string;
    total: string;
  };
  currency: string;
};

export default function OrderSummary({ items, formatUsd, lines, currency }: OrderSummaryProps) {
  return (
    <aside className="p-5 rounded-xl border bg-muted/30 space-y-4 lg:sticky lg:top-24" aria-label="ملخص الطلب">
      <h2 className="font-semibold text-lg">ملخص الطلب</h2>

      <ul className="space-y-3 max-h-72 overflow-y-auto">
        {items.map((item) => {
          const { name, image } = itemDisplay(item);
          return (
            <li key={`${item.productId}:${item.variantId ?? ""}`} className="flex items-center gap-3 text-sm">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="size-12 rounded-lg object-cover border" />
              ) : (
                <div className="size-12 rounded-lg bg-muted border" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="text-muted-foreground">الكمية: {item.quantity}</p>
              </div>
              <span className="shrink-0">{formatUsd(item.price * item.quantity)}</span>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-2 text-sm border-t pt-4">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">المجموع الفرعي</dt>
          <dd>{lines.subtotal}</dd>
        </div>
        {lines.discount && (
          <div className="flex justify-between text-green-700">
            <dt>الخصم</dt>
            <dd>−{lines.discount}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">الشحن</dt>
          <dd>{lines.shipping}</dd>
        </div>
        <div className="flex justify-between border-t pt-3 font-semibold text-base">
          <dt>الإجمالي قبل الضريبة</dt>
          <dd>{lines.total}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        تُضاف ضريبة القيمة المضافة حسب دولة الشحن، ويظهر المبلغ النهائي بعملة {currency} في صفحة الدفع الآمنة.
      </p>
    </aside>
  );
}