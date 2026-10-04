// src/modules/notifications/auth-email-templates.ts
// قوالب بريد المصادقة (عربي/إنجليزي) بنفس هوية قالب تأكيد الطلب.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Copy {
  title: string;
  hello: string;
  body: string;
  cta: string;
  url: string;
  note: string;
}

function section(c: Copy, ar: boolean): string {
  return `
  <div dir="${ar ? "rtl" : "ltr"}" style="text-align:${ar ? "right" : "left"};font-family:Tahoma,Arial,sans-serif;color:#222;line-height:1.7">
    <h2 style="margin:0 0 8px">${c.title}</h2>
    <p style="margin:0 0 4px">${c.hello}</p>
    <p style="margin:0 0 16px">${c.body}</p>
    <p style="margin:20px 0"><a href="${esc(c.url)}" style="background:#1f6f43;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">${c.cta}</a></p>
    <p style="margin:0;color:#666;font-size:13px">${c.note}</p>
  </div>`;
}

function layout(ar: Copy, en: Copy): string {
  return `
  <div style="max-width:600px;margin:0 auto;padding:24px;background:#fff">
    <h1 style="text-align:center;margin:0 0 24px;color:#1f6f43">Alzain Tea | الزين للشاي</h1>
    ${section(ar, true)}
    <hr style="border:none;border-top:1px solid #ddd;margin:32px 0" />
    ${section(en, false)}
  </div>`;
}

export function buildPasswordResetEmail(d: { name: string; resetUrl: string; expiresMinutes: number }) {
  const n = esc(d.name);
  const html = layout(
    {
      title: "استعادة كلمة المرور",
      hello: `مرحباً ${n}،`,
      body: `تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. اضغط الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لمدة <b>${d.expiresMinutes} دقيقة</b> ويُستخدم مرة واحدة فقط.`,
      cta: "تعيين كلمة مرور جديدة",
      url: d.resetUrl,
      note: "إن لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.",
    },
    {
      title: "Reset your password",
      hello: `Hello ${n},`,
      body: `We received a request to reset your account password. Click the button below to choose a new one. The link is valid for <b>${d.expiresMinutes} minutes</b> and can be used once.`,
      cta: "Set a new password",
      url: d.resetUrl,
      note: "If you didn't request this, you can safely ignore this email — your password won't change.",
    },
  );
  return {
    subject: "استعادة كلمة المرور | Reset your password",
    html,
    text: `استعادة كلمة المرور (صالح ${d.expiresMinutes} دقيقة):\n${d.resetUrl}\n\nReset your password (valid ${d.expiresMinutes} minutes):\n${d.resetUrl}`,
  };
}

export function buildPasswordChangedEmail(d: { name: string; forgotUrl: string }) {
  const n = esc(d.name);
  const html = layout(
    {
      title: "تم تغيير كلمة المرور",
      hello: `مرحباً ${n}،`,
      body: "تم تغيير كلمة مرور حسابك للتو. إن كنت أنت من قام بذلك فلا حاجة لأي إجراء.",
      cta: "لم أقم بذلك — أعد تعيين كلمة المرور",
      url: d.forgotUrl,
      note: "إن لم تكن أنت، أعد تعيين كلمة المرور فوراً وتواصل معنا.",
    },
    {
      title: "Your password was changed",
      hello: `Hello ${n},`,
      body: "Your account password was just changed. If this was you, no action is needed.",
      cta: "Wasn't me — reset my password",
      url: d.forgotUrl,
      note: "If this wasn't you, reset your password immediately and contact us.",
    },
  );
  return {
    subject: "تم تغيير كلمة المرور | Your password was changed",
    html,
    text: `تم تغيير كلمة مرور حسابك. إن لم تكن أنت: ${d.forgotUrl}\n\nYour password was changed. If it wasn't you: ${d.forgotUrl}`,
  };
}