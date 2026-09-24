export interface OrderEmailItem {
  nameAr: string;
  nameEn: string;
  variantName?: string | null;
  quantity: number;
  price: number; // سعر الوحدة بعملة الطلب
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  currency: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  items: OrderEmailItem[];
  trackUrl?: string;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function section(d: OrderEmailData, lang: "ar" | "en"): string {
  const ar = lang === "ar";
  const locale = ar ? "ar-SA-u-nu-latn" : "en-US";
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: d.currency }).format(n);
  const end = ar ? "left" : "right";
  const cell = `padding:8px 0;border-bottom:1px solid #eee;`;

  const rows = d.items
    .map((i) => {
      const base = ar ? i.nameAr : i.nameEn;
      const name = esc(i.variantName ? `${base} — ${i.variantName}` : base);
      return `<tr><td style="${cell}">${name} × ${i.quantity}</td><td style="${cell}text-align:${end}">${money(
        i.price * i.quantity,
      )}</td></tr>`;
    })
    .join("");

  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px;" : ""}">${label}</td><td style="padding:4px 0;text-align:${end};${
      bold ? "font-weight:bold;font-size:16px;" : ""
    }">${value}</td></tr>`;

  const t = ar
    ? {
        title: "شكراً لطلبك!",
        hello: `مرحباً ${esc(d.customerName)}،`,
        intro: `تم استلام دفعتك وتأكيد طلبك رقم <b>#${d.orderNumber}</b>. سنبدأ بتجهيزه قريباً.`,
        subtotal: "المجموع الفرعي",
        discount: "الخصم",
        shipping: "الشحن",
        tax: "الضريبة",
        total: "الإجمالي",
        track: "تتبع طلبك",
      }
    : {
        title: "Thank you for your order!",
        hello: `Hello ${esc(d.customerName)},`,
        intro: `Your payment was received and order <b>#${d.orderNumber}</b> is confirmed. We'll start preparing it shortly.`,
        subtotal: "Subtotal",
        discount: "Discount",
        shipping: "Shipping",
        tax: "Tax",
        total: "Total",
        track: "Track your order",
      };

  return `
  <div dir="${ar ? "rtl" : "ltr"}" style="text-align:${ar ? "right" : "left"};font-family:Tahoma,Arial,sans-serif;color:#222;line-height:1.7">
    <h2 style="margin:0 0 8px">${t.title}</h2>
    <p style="margin:0 0 4px">${t.hello}</p>
    <p style="margin:0 0 16px">${t.intro}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${rows}
      ${line(t.subtotal, money(d.subtotal))}
      ${d.discount > 0 ? line(t.discount, `- ${money(d.discount)}`) : ""}
      ${line(t.shipping, money(d.shippingCost))}
      ${line(t.tax, money(d.tax))}
      ${line(t.total, money(d.total), true)}
    </table>
    ${
      d.trackUrl
        ? `<p style="margin-top:20px"><a href="${esc(d.trackUrl)}" style="background:#1f6f43;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">${t.track}</a></p>`
        : ""
    }
  </div>`;
}

export function buildOrderConfirmationEmail(d: OrderEmailData) {
  const subject = `تأكيد طلبك #${d.orderNumber} | Order confirmation #${d.orderNumber}`;

  const html = `
  <div style="max-width:600px;margin:0 auto;padding:24px;background:#fff">
    <h1 style="text-align:center;margin:0 0 24px;color:#1f6f43">Alzain Tea | الزين للشاي</h1>
    ${section(d, "ar")}
    <hr style="border:none;border-top:1px solid #ddd;margin:32px 0" />
    ${section(d, "en")}
  </div>`;

  const text = `تأكيد طلبك #${d.orderNumber}\nالإجمالي: ${d.total} ${d.currency}\n\nOrder #${d.orderNumber} confirmed.\nTotal: ${d.total} ${d.currency}`;

  return { subject, html, text };
}