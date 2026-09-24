# دليل إعداد بيئة Staging — متجر الزين للشاي

الهدف: بيئة مطابقة للإنتاج في كل شيء **ما عدا** المال والبيانات الحقيقية، لتجربة رحلة الشراء كاملة بأمان قبل الإطلاق.

---

## 1. فصل البيئات

| العنصر | Local | Staging | Production |
|---|---|---|---|
| قاعدة البيانات | Neon branch `dev` | Neon branch `staging` | Neon (Production) |
| Stripe | test | test | **live** |
| البوابة الخليجية (Tap/Moyasar) | test | test | **live** |
| Upstash Redis | dev | قاعدة مستقلة | قاعدة مستقلة |
| Resend | `onboarding@resend.dev` | `onboarding@resend.dev` أو دومين موثّق | **دومين موثّق** |
| نطاق Vercel | — | Preview (فرع `develop`) | Production (فرع `main`) |
| بيانات البذر (seed) | نعم | نعم | **لا إطلاقاً** |

> **قاعدتان لا تُكسران:** لا مفتاح `live` في Staging، ولا `prisma:seed` في Production (يحتوي مستخدمين تجريبيين).

---

## 2. الخطوات

### 2.1 قاعدة البيانات (Neon)
1. من لوحة Neon أنشئ **Branch** باسم `staging`.
2. ستحتاج رابطين لنفس الفرع:
   - **Pooled** (الـ host فيه `-pooler`) ← يوضع في `DATABASE_URL` على Vercel.
   - **Direct** (بدون `-pooler`) ← للهجرات فقط.
3. طبّق الهجرات والبيانات التجريبية (PowerShell):
   ```powershell
   $env:DATABASE_URL="<رابط staging المباشر Direct>"
   npx prisma migrate deploy
   npm run prisma:seed
   Remove-Item Env:DATABASE_URL
   ```
   استخدم دائماً `migrate deploy` وليس `db push` خارج بيئة التطوير.

### 2.2 Upstash
أنشئ قاعدة Redis جديدة لـ Staging حتى لا تختلط عدّادات الـ Rate Limit مع الإنتاج.

### 2.3 Vercel
1. **Domains:** أضف `staging.your-domain.com` واربطه بالفرع `develop` (Git Branch).
2. **Environment Variables:** أضف كل متغيرات `.env.example` بالنطاق **Preview** وحدد Git Branch = `develop`.
3. **Build & Development Settings:**
   - Install Command: `npm ci`
   - Build Command: `prisma generate && next build` (إن لم تكن `prisma generate` ضمن `postinstall`).
4. **Deployment Protection:** فعّل Vercel Authentication (أو كلمة مرور) حتى لا يصل الجمهور ولا محركات البحث لـ Staging.
5. **لأن الحماية ستحجب الـ Webhooks القادمة من Stripe/Tap:** من Settings → Deployment Protection → *Protection Bypass for Automation* ولّد سراً، ثم أضفه لرابط كل Webhook:
   ```
   https://staging.your-domain.com/api/webhooks/stripe?x-vercel-protection-bypass=<SECRET>
   ```
   (التوقيع يُحسب على جسم الطلب، فلا يتأثر بإضافة هذا البارامتر.)
6. **تنبيه مهم:** مهام **Vercel Cron لا تعمل على نشرات Preview** — تعمل على Production فقط. في Staging اختبر مهمة انتهاء الطلبات يدوياً (انظر الفقرة 2.6).

### 2.4 بوابات الدفع (وضع الاختبار)
- **Stripe:** Developers → Webhooks → Add endpoint على رابط staging أعلاه، بالأحداث `checkout.session.completed` و `checkout.session.expired`، وانسخ Signing secret إلى `STRIPE_WEBHOOK_SECRET`.
  - بطاقات الاختبار: `4242 4242 4242 4242` (نجاح) — `4000 0000 0000 9995` (رفض: رصيد غير كافٍ) — `4000 0025 0000 3155` (يتطلب 3D Secure). أي تاريخ مستقبلي وأي CVC.
- **Tap / Moyasar:** استخدم مفاتيح الاختبار، وضع رابط الـ Webhook `.../api/webhooks/local-gateway?x-vercel-protection-bypass=<SECRET>`. بطاقات الاختبار تؤخذ من وثائق المزود الرسمية.
  - اضبط `LOCAL_GATEWAY_WEBHOOK_SECRET` حسب المزود النشط (Tap: سر توقيع hashstring — Moyasar: قيمة `secret_token`).
  - **Apple Pay** يحتاج تحقق نطاق (Domain Verification) ولن يعمل غالباً على نطاق staging — اختبره على الإنتاج ضمن قائمة الإطلاق.
- **محلياً** (للتجربة السريعة): `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 2.5 البريد (Resend)
- `onboarding@resend.dev` يسلّم فقط لبريد صاحب حساب Resend — استخدم بريدك كعميل تجريبي.
- لاختبار بريد بأي عنوان، وثّق دومين وضع `EMAIL_FROM` منه.

### 2.6 التحقق قبل بدء UAT
```powershell
# 1) فحص المتغيرات
npx tsx scripts/preflight-check.ts --env=staging --file=.env.staging

# 2) اختبار الدخان على الرابط المنشور
$env:CRON_SECRET="<CRON_SECRET الخاص بـ staging>"
npx tsx scripts/smoke-test.ts --url=https://staging.your-domain.com --staging --bypass=<SECRET> --with-cron --with-ratelimit
```
يجب أن تكون النتيجة **0 فشل**. ثم انتقل إلى `docs/UAT-CHECKLIST.md`.

### 2.7 إعادة ضبط البيانات بين جولات UAT
```powershell
$env:DATABASE_URL="<رابط staging المباشر Direct>"
npx prisma migrate reset --force   # ⚠️ يمسح كل شيء — تأكد أن الرابط لـ staging وليس الإنتاج
Remove-Item Env:DATABASE_URL
```

---

## 3. قائمة تحقق سريعة لجاهزية Staging

- [ ] `/api/health` يرجع 200 على رابط staging
- [ ] تسجيل الدخول بحساب `ADMIN` التجريبي ينجح، والوصول لـ `/admin` يعمل
- [ ] طلب تجريبي بـ Stripe ينتهي بحالة `CONFIRMED` وبريد وصل
- [ ] طلب تجريبي بالبوابة الخليجية (دولة SA) ينتهي بحالة `CONFIRMED`
- [ ] Webhook مُعاد إرساله من لوحة Stripe لا يكرر خصم المخزون ولا البريد
- [ ] الموقع غير قابل للفهرسة (`noindex`) — يتحقق منه `smoke-test.ts --staging`