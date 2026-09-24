# CLAUDE.md — دليل مشروع متجر الزين للشاي (Alzain Tea)

> وثيقة شاملة لجميع تفاصيل المشروع، البنية المعمارية، التقنيات، تدفقات الأعمال، المخططات، والتقدم التنفيذي لمساعدة المطورين ونماذج الذكاء الاصطناعي (Claude / Agents) في فهم وتطوير المتجر بدقة وسرعة وبأعلى المعايير.

---

## 📌 1. نظرة عامة على المشروع (Project Overview)

**متجر الزين للشاي (Alzain Tea)** هو منصة تجارة إلكترونية متخصصة في بيع أجود أنواع الشاي الفاخر وملحقاته، مصممة خصيصاً لتلبي احتياجات السوق الخليجي (السعودية، سلطنة عمان، الإمارات، الكويت، البحرين، قطر) بالإضافة إلى الشحن الدولي.

### المعمارية المعتمدة (Architectural Decision):
- **Modular Monolith داخل Next.js**: تطبيق متكامل (Fullstack) بدون خادم منفصل، مقسم داخلياً إلى وحدات مستقلة منطقياً في مجلد `src/modules/` تتبع نمط الطبقات الصارم:
  $$\text{Route Handler (Controller)} \longrightarrow \text{Validator (Zod)} \longrightarrow \text{Service (Business Logic)} \longrightarrow \text{Repository (Prisma Data Access)}$$
- **واجهات برمجة التطبيقات (API Style)**: REST موحد عبر Next.js Route Handlers، مع اعتماد صيغة استجابة موحدة للنجاح والأخطاء (`ok`, `fail`, `ApiError`).

### الأهداف الأساسية:
- **تجربة مستخدم راقية وثنائية اللغة (i18n):** دعم كامل للغتين العربية (RTL) والإنجليزية (LTR) مع تبديل فوري عبر `next-intl`.
- **نظام دفع ذكي متعدد المزودين (Dual Gateway & Strategy Pattern - منجز بالكامل):** طبقة دفع موحدة (`PaymentProvider`) تدعم **Stripe** للعملاء الدوليين (US, GB وبقية العالم) بالدولار الأمريكي، وبوابات الدفع الخليجية المحلية (**Tap Payments** و **Moyasar**) لدعم العملات المحلية، و Apple Pay و Mada والبطاقات الخليجية. يتم التبديل بين مزودي الخليج عبر Feature Flag دون أي تعديل برمجي.
- **إتمام شراء متكامل وآمن (Checkout & Stock Reservation):** إعادة احتساب كاملة للأسعار، الضرائب (VAT)، الشحن، والخصومات على الخادم، مع حجز فوري للمخزون (`reservedStock`) داخل معاملة Prisma واحدة لمنع البيع الزائد (Overselling)، مع آلية تحرير فوري للمخزون (`releaseReservedStock`) عند فشل الدفع أو إلغائه.
- **دورة حياة متكاملة للطلبات وآلة حالات صارمة (Orders Lifecycle & State Machine - منجز بالكامل):** نموذج آلة حالات نقي (`order-status.ts`) يتحكم بانتقالات حالات الطلب من `PENDING` حتى `DELIVERED` أو `CANCELLED` أو `REFUNDED`، مع إدارة ذرية للمخزون (`RELEASE_RESERVED` و `RESTOCK`) وسجل تدقيق تفصيلي زمني (`OrderStatusLog`).
- **إلغاء واسترداد مالي آمن بقفل تزامني (Refund Concurrency Lock & Customer Cancel):** إتاحة إلغاء الطلب للعميل في المراحل المبكرة، وإلغاء واسترداد إداري تلقائي عبر بوابة الدفع الأصلية مع قفل تزامني (`claimRefund`) يمنع ازدواجية العمليات المالية.
- **جدولة آلية لتحرير المخزون المنتهي (Automated Stock Expiration Cron):** مهمة دورية مجدولة عبر Vercel Cron (`/api/cron/expire-orders`) محروسة بـ `CRON_SECRET` تفحص الطلبات غير المدفوعة التي تجاوزت مهلتها (60 دقيقة) وتحرر المخزون المحجوز فوراً دون تدخل يدوي.
- **نظام تقييمات ومراجعات موثّقة واعتدال إداري (Verified Reviews & Moderation - منجز بالكامل):** تقييمات المنتجات مقتصرة فقط على المشترين الذين استلموا طلباتهم فعلياً (`DELIVERED`)، مع تقييد مراجعة واحدة لكل مستخدم لكل منتج، وحساب توزيع التقييمات، وإخفاء أسماء المراجعين للخصوصية، ولوحة إدارة كاملة لاعتماد أو رفض أو حذف المراجعات (`/admin/reviews`).
- **قائمة رغبات سريعة ومتزامنة (Wishlist System - منجز بالكامل):** إضافة وحذف المنتجات في قائمة الرغبات بآلية Idempotent ضد التكرار، مع دعم نقطة نهاية خفيفة وسريعة (`idsOnly`) لفحص حالة الأيقونات في الكتالوج، وحساب المخزون الفعلي المتاح لحظياً.
- **إشعارات البريد وتأكيد الطلب التلقائي (Transactional Emails via Resend - منجز بالكامل):** إرسال فوري لرسائل تأكيد الطلب والفواتير باللغتين العربية والإنجليزية، بحجز ذري يمنع إرسال البريد مرتين (`claimConfirmationEmail`)، وتكامل غير معطل عبر Next.js `after()` داخل معالجات الـ Webhook.
- **لوحة تقارير وتحليلات إدارية شاملة (Admin Analytics & Reports Dashboard - منجز بالكامل):** استعراض حي لمؤشرات الأداء الرئيسية (KPIs)، الإيرادات مفصلة حسب العملات المختلفة، المبيعات حسب الدول، المنتجات الأكثر مبيعاً، وسلسلة زمنية يومية للطلبات، مع محرك تنبيهات المخزون المنخفض.
- **إصلاحات معمارية شاملة وتوافق Next.js 16 و Prisma 7 (System-wide Fixes & Hardening):** توافق كامل مع معايير Next.js الحديثة لبارامترات المسارات غير التزامنية (`await params`)، توحيد كلي لمعالجة الأخطاء (`handleApiError` و `fail`)، وترقية مشغل Prisma إلى Driver Adapter الحديث (`@prisma/adapter-pg` و `PrismaPg`) مع ملف التكوين `prisma.config.ts`.
- **التدقيق الأمني الآلي والتحصين الشامل (Security Hardening & Automated API Audit - منجز بالكامل):** جناح تدقيق معماري آلي عبر `src/__tests__/security/api-audit.test.ts` يفحص عدم وصول الـ Route Handlers لـ Prisma مباشرة، وإلزامية `requireAdmin()` لمسارات الإدارة، و `requireUser()` لمسارات المستخدم، والتحقق عبر Zod لجميع عمليات الكتابة (POST/PUT/PATCH)، والتعامل الموحد مع الأخطاء عبر `fail()` و `handleApiError()`، وانتظار المعاملات الديناميكية غير التزامنية (`await params`)، وحظر الـ Raw SQL غير الآمن وحصر `dangerouslySetInnerHTML` على وسوم الـ JSON-LD فقط، والتأكد من عدم تسريب أي أسرار عبر متغيرات `NEXT_PUBLIC_*`.
- **ترويسات أمان متقدمة ودفاع بالعمق (Enterprise Security Headers & CSP - منجز بالكامل):** ترويسات أمنية مشددة في `next.config.ts` تشمل سياسة أمان المحتوى (Content Security Policy مع وضع التقرير المبدئي Report-Only وقابلية الإنفاذ عبر `CSP_ENFORCE="true"`، وتضمين مصادر Stripe و Vercel Scripts و Google Fonts)، Strict-Transport-Security (HSTS)، X-Frame-Options: DENY لمنع هجمات Clickjacking، X-Content-Type-Options: nosniff لمنع استنتاج MIME، Referrer-Policy، Permissions-Policy، وحجب ترويسة كشف التقنية `x-powered-by`.
- **تحديد معدل متقدم متعدد الطبقات (Multi-Tier Edge & Route Rate Limiting - منجز بالكامل):** منظومة تقييد معدل الطلبات عبر Upstash Redis تعمل على مستوى الـ Edge Middleware وعلى مستوى الـ Route Handlers بنافذة منزلقة (Sliding Window): تحديد مسارات المصادقة والتسجيل (10 في الدقيقة، و 40 في الساعة)، تحديد عمليات الكتابة الحساسة كالكوبونات والمراجعات والطلبات (30 في الدقيقة)، تحديد عام للـ API (120 في الدقيقة)، وتحديد مسارات الإدارة (300 في الدقيقة)، مع آلية Fail-Open ذكية تضمن استمرار عمل المتجر في حال تعثر خدمة Redis.
- **محرك تحسين محركات البحث والبيانات المهيكلة المتقدمة (SEO Engine, JSON-LD & Dynamic Sitemap - منجز بالكامل):** موديول متكامل `src/modules/seo/` يدعم كاش سريع (`unstable_cache`)، وتوليد بيانات وصفية ديناميكية للمنتجات والفئات باللغتين العربية والإنجليزية (`generateMetadata`)، وتوليد خريطة موقع ديناميكية `sitemap.ts` مع إعادة التحقق كل ساعة (`revalidate = 3600`)، وملف `robots.ts` ذكي يحجب مسارات الإدارة والـ API والفلاتر المكررة، وحقن بيانات مهيكلة غنية `JSON-LD` (`Product` متضمنة الأسعار بالدولار، التوافر، التقييمات، والـ SKU، بالإضافة إلى شجرة الروابط `BreadcrumbList`).
- **فهارس مركبة عالية الأداء لقاعدة البيانات (High-Performance Composite Database Indexes - منجز بالكامل):** إضافة فهارس علائقية مركبة في Prisma Schema (`[status, categoryId]`, `[status, createdAt]`, `[userId, createdAt]`, `[paymentStatus, createdAt]`, `[status, paymentStatus, createdAt]`, `[productId, status]`) لتسريع استعلامات تصفح الكتالوج، التقارير والإحصائيات، الكرون التلقائي، وتجميع التقييمات المعتمدة.
- **حزمة اختبارات E2E شاملة مع Playwright (End-to-End Testing Suite - منجز بالكامل):** تغطية آلية لرحلة الشراء الكاملة للزائر (تصفح الكتالوج $\to$ صفحة المنتج $\to$ الإضافة للسلة $\to$ مراجعة السلة $\to$ الانتقال لإتمام الشراء بدون إجبار على تسجيل الدخول)، واختبار حراس المسارات (Auth Guards) وحظر الوصول غير المصرح، والتحقق من صحة ترويسات الأمان ومحركات البحث (robots, sitemap, JSON-LD) ورفض الـ JSON التالف بصيغة أخطاء موحدة.
- **خط أنابيب التكامل المستمر (GitHub Actions CI/CD Pipeline - منجز بالكامل):** سير عمل آلي `.github/workflows/ci.yml` يعمل عند كل Push و Pull Request على فروع `main` و `develop` لتشغيل توليد Prisma Client، الفحص اللغوي (lint)، اختبارات الوحدة والتدقيق الأمني (Vitest + API Audit)، فحص الثغرات في الاعتماديات (`audit:deps`)، وبناء حزمة الإنتاج (`npm run build`).
- **تعدد العملات وحساب الشحن الديناميكي:** دعم كامل لعملات دول الخليج (SAR, AED, OMR, KWD, BHD, QAR) مع معالجة دقيقة للعملات ثلاثية الخانات العشرية (KWD, BHD, OMR)، بالإضافة إلى العملات العالمية (USD, EUR, GBP) مع حساب تكلفة وأيام الشحن المتوقعة حسب الدولة.
- **سلة مشتريات ذكية ومتزامنة (Cart System):** إدارة السلة عبر Zustand محلياً مع دعم المفاتيح المتعددة (`guest` و `userId`)، ودمج تلقائي عند تسجيل الدخول (`cart-merge.ts`)، وتحقق لحظي من المخزون والأسعار عبر `/api/cart/validate`.
- **نظام كوبونات وعناوين متطور:** التحقق الصارم من شروط الكوبونات (حد أدنى، حد استخدام عام ولكل مستخدم، تاريخ الصلاحية)، وإدارة العناوين مع حماية الملكية للمستخدم المسجل.
- **Webhooks موثوقة ومحمية من التكرار (Idempotent Webhooks):** معالجة أحداث الدفع من Stripe و Tap و Moyasar مع التحقق المشفر من التواقيع (HMAC-SHA256 و Timing-Safe Equal)، وضمان عدم تكرار خصم أو تحرير المخزون.
- **لوحة تحكم إدارية وبوابة عملاء متكاملة (Admin Dashboard & Customer Orders Portal):** لوحة إدارة كاملة للطلبات والمنتجات والفئات والمراجعات والتقارير (`/admin`)، وبوابة لمتابعة وتتبع طلبات العميل وقائمة رغباته (`/account/orders`, `/account/wishlist`).

---

## 🛠️ 2. المكدس التقني (Tech Stack)

| المجال | التقنية المستخدمة | التفاصيل والغرض |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.1.6 (App Router)** | إطار العمل الأساسي، Server Components و Client Components و Route Handlers مع دعم Async Params |
| **Language** | **TypeScript 5** | فحص صارم للأنواع ومشاركة واجهات البيانات بين الـ Backend والـ Frontend |
| **UI Library** | **React 19.2.3** | أحدث إصدار مع دعم React Actions والـ Hooks المتقدمة |
| **Styling** | **Tailwind CSS v4 + PostCSS** | تنسيق سريع وحديث مع متغيرات التصميم في `src/styles/variables.css` |
| **Database & ORM** | **PostgreSQL (Neon) + Prisma 7** | قاعدة بيانات علائقية متقدمة مع Prisma Client ومشغل `@prisma/adapter-pg` (`PrismaPg`) وفهارس مركبة عالية الأداء وتكوين `prisma.config.ts` |
| **Validation** | **Zod 4** | التحقق الصارم من مدخلات الـ API، ونماذج الـ Frontend عبر `@hookform/resolvers` |
| **State Management** | **Zustand 5** | إدارة حالة السلة واختيار الدولة (`cart-store.ts`, `useCountry.ts`) |
| **Cart Persistence & Sync** | **Local Storage + Custom Merge** | إدارة السلة محلياً مع دعم دمج سلة الزائر مع حساب المستخدم عند تسجيل الدخول |
| **Data Fetching & Cache**| **TanStack React Query 5 + Axios** | استعلامات الخادم في الواجهة، كاش ذكي، وإلغاء الاستعلامات التلقائي للطلبات والمنتجات والمراجعات والتقارير |
| **Authentication** | **NextAuth.js (v4 JWT)** | إدارة الجلسات، الأدوار (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`) وحماية المسارات |
| **Password Hashing** | **Argon2 (argon2id)** | تشفير فائق الأمان لكلمات المرور وفق معايير OWASP (مع دعم fallback لـ bcrypt) |
| **Rate Limiting** | **Upstash Redis + @upstash/ratelimit** | تحديد معدل متقدم متعدد الطبقات (Edge Middleware + Route Handlers) مع Sliding Window و Fail-Open |
| **Security Headers & CSP** | **Enterprise HTTP Headers** | سياسة أمان المحتوى (CSP Report-Only/Enforce)، HSTS، X-Frame-Options DENY، X-Content-Type-Options، و Permissions-Policy |
| **SEO & Structured Data** | **Next Metadata + JSON-LD** | توليد ديناميكي لـ Metadata و OpenGraph و Twitter Cards، مع خريطة موقع ديناميكية `sitemap.ts`، `robots.ts`، ومخططات `Product` و `BreadcrumbList` |
| **Payments** | **Stripe + Tap + Moyasar (مكتمل بالكامل)** | طبقة موحدة (`PaymentProvider`) مع توجيه ذكي للدول الخليجية والدولية، دعم Apple Pay و Mada، تحويل دقيق لعملات الخليج، وتبديل عبر Feature Flag، وWebhooks مؤمنة بـ HMAC وTiming-Safe |
| **Transactional Email** | **Resend (v6)** | إرسال بريد تأكيد الطلبات والفواتير مع قوالب HTML/Text غنية، وحجز ذري يمنع التكرار وتكامل غير معطل عبر `after()` |
| **Cron & Background Tasks** | **Vercel Cron (`vercel.json`)** | جدولة مهام آلية كل 15 دقيقة لتحرير المخزون المحجوز للطلبات المنتهية عبر `/api/cron/expire-orders` |
| **Testing (Unit & Audit)** | **Vitest** | اختبارات وحدة وتكاملية لدورة الدفع والـ Idempotency، واختبارات آلة حالات الطلب، واختبارات خدمة البريد، وتدقيق معماري أمني آلي للمسارات (`api-audit.test.ts`) |
| **Testing (E2E)** | **Playwright (@playwright/test)** | حزمة اختبارات E2E شاملة لرحلة الشراء، حراس المسارات (Guards)، ترويسات الأمان، الـ SEO، وفحص عقود الـ API |
| **CI / CD Pipeline** | **GitHub Actions** | سير عمل جودة وأمان آلي (`.github/workflows/ci.yml`) يشمل Lint, Vitest, Security Audit, Dependency Audit, و Build |
| **Formatting** | **Native Intl APIs** | تنسيق مالي وتاريخي متعدد العملات يدعم العملات الخليجية ثلاثية الخانات (KWD, BHD, OMR) تلقائياً |
| **Localization (i18n)**| **next-intl** | الترجمة وتعدد اللغات مع ملفات الرسائل في `src/messages/` وتوافق كامل مع اتجاه RTL |
| **Theme** | **next-themes** | دعم الوضع الداكن والفاتح (Dark / Light Mode) |
| **Animations** | **GSAP + Lottie** | مؤثرات حركية فاخرة (`@lottiefiles`, `lottie-react`, `gsap`) |
| **Icons** | **Lucide React + React Icons + Iconify** | حزمة أيقونات عصرية للمتجر ولوحة الإدارة |

---

## 📂 3. البنية المعمارية وهيكل المجلدات (Project Architecture)

المشروع مبني وفق معمارية Modular Monolith ونمط التصميم الذري (Atomic Design):

```text
alzainTea/
├── .github/
│   └── workflows/
│       └── ci.yml                   # خط أنابيب CI الآلي (lint, vitest, security audit, audit:deps, build)
├── e2e/                             # حزمة اختبارات E2E الشاملة عبر Playwright
│   ├── guards-and-api.e2e.ts        # اختبار حراس المسارات (Auth Guards) وصيغة الـ API وعقود الأخطاء
│   ├── security-and-seo.e2e.ts      # اختبار ترويسات الأمان ومحركات البحث (robots, sitemap, JSON-LD) والـ Rate Limit
│   └── shopping-journey.e2e.ts      # اختبار رحلة الشراء الكاملة للزائر (كتالوج ← منتج ← سلة ← Checkout)
├── playwright.config.ts             # إعدادات Playwright وتكامل خادم الويب
├── prisma.config.ts                 # تكوين Prisma 7 ومحددات الهجرة وبذر البيانات
├── prisma/
│   ├── migrations/                  # سجل هجرات قاعدة البيانات (يشمل فهارس الأسبوع 8 المركبة)
│   ├── schema.prisma                # المخطط الكامل (11 نموذجاً، 6 Enums، وفهارس مركبة عالية الأداء)
│   └── seed.ts                      # بذر البيانات الأولية (أصناف، منتجات، متغيرات، مستخدمين)
├── public/
│   ├── assets/                      # أصول الوسائط (صور وأيقونات وملفات Lottie)
│   └── favicon.ico
├── src/
│   ├── __tests__/                   # اختبارات الأمان والتدقيق المعماري
│   │   └── security/
│   │       └── api-audit.test.ts    # تدقيق أمني ومعماري آلي لكافة مسارات الـ API والكود
│   ├── animations/                  # خطافات وحركات GSAP
│   ├── app/                         # App Router الخاص بـ Next.js
│   │   ├── (auth)/                  # مسارات المصادقة
│   │   │   ├── login/page.tsx       # تسجيل الدخول
│   │   │   ├── register/page.tsx    # تسجيل حساب جديد
│   │   │   └── forgot-password/     # استعادة كلمة المرور
│   │   ├── (public)/                # صفحات عامة ثابتة (about, faqs, pricing)
│   │   ├── (shop)/                  # صفحات المتجر الموجهة للعميل
│   │   │   ├── layout.tsx           # تخطيط المتجر الرئيسي (Header + Footer + CartDrawer)
│   │   │   ├── products/            # دليل المنتجات والبحث والفلترة
│   │   │   │   └── [slug]/
│   │   │   │       ├── layout.tsx   # توليد ديناميكي لـ Metadata وحقن Product & Breadcrumbs JSON-LD
│   │   │   │       └── page.tsx     # صفحة تفاصيل المنتج والمراجعات
│   │   │   ├── category/            # تصفح المنتجات حسب الفئة
│   │   │   │   └── [slug]/
│   │   │   │       ├── layout.tsx   # توليد ديناميكي لـ Metadata وحقن Category Breadcrumbs JSON-LD
│   │   │   │       └── page.tsx     # عرض منتجات الفئة
│   │   │   ├── cart/                # صفحة مراجعة سلة المشتريات
│   │   │   ├── checkout/            # مسار الدفع والشحن
│   │   │   │   ├── cancel/          # صفحة إلغاء الدفع
│   │   │   │   ├── success/         # صفحة نجاح الدفع وتأكيد الطلب
│   │   │   │   └── page.tsx         # صفحة Checkout الرئيسية
│   │   │   └── account/             # بوابة العميل
│   │   │       ├── orders/          # قائمة طلبات العميل
│   │   │       │   └── [id]/        # تفاصيل وتتبع الطلب للعميل وإلغاؤه
│   │   │       ├── wishlist/        # صفحة استعراض وإدارة قائمة الرغبات
│   │   │       └── page.tsx         # الملف الشخصي والعناوين
│   │   ├── admin/                   # شاشات لوحة تحكم الإدارة (محمية بـ ADMIN)
│   │   │   ├── categories/          # إدارة وتعديل وإنشاء الفئات
│   │   │   ├── products/            # إدارة المنتجات (قائمة، جديد، وتعديل [id])
│   │   │   ├── orders/              # إدارة ومتابعة الطلبات وتحديث حالاتها واستردادها
│   │   │   ├── reviews/             # إدارة واعتدال مراجعات العملاء (قبول / رفض / حذف)
│   │   │   └── page.tsx             # لوحة الإحصائيات العامة ومؤشرات الـ KPIs والمبيعات
│   │   ├── api/                     # واجهات الـ HTTP الخلفية (Route Handlers)
│   │   │   ├── addresses/           # GET (قائمة عناوين المستخدم) و POST (إضافة عنوان)
│   │   │   │   └── [id]/            # PATCH (تعديل) و DELETE (حذف عنوان)
│   │   │   ├── admin/               # مسارات إدارية محمية (requireAdmin)
│   │   │   │   ├── categories/      # GET (قائمة الإدارة) و POST (إنشاء فئة)
│   │   │   │   │   └── [id]/        # GET, PATCH, DELETE للفئة
│   │   │   │   ├── orders/          # GET قائمة كل الطلبات بالفلترة والبحث والترقيم
│   │   │   │   │   └── [id]/        # GET تفاصيل الطلب + PATCH تحديث الحالة والاسترداد والمخزون
│   │   │   │   ├── products/        # GET (قائمة الإدارة كاملة) و POST (إضافة منتج)
│   │   │   │   │   └── [id]/        # GET, PATCH, DELETE للمنتج
│   │   │   │   ├── reports/         # تقارير الإدارة والمبيعات
│   │   │   │   │   ├── overview/    # GET ملخص الإيرادات والمبيعات والـ KPIs والسلاسل اليومية
│   │   │   │   │   └── low-stock/   # GET تنبيهات المنتجات ذات المخزون المنخفض
│   │   │   │   └── reviews/         # إدارة المراجعات
│   │   │   │       ├── route.ts     # GET استعراض المراجعات مع فلترة الحالة والترقيم
│   │   │   │       └── [id]/        # PATCH (اعتماد/رفض) و DELETE للمراجعة
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/   # معالج جلسات NextAuth
│   │   │   │   └── register/        # POST تسجيل مستخدم جديد
│   │   │   ├── cart/
│   │   │   │   └── validate/        # POST التحقق من توفر عناصر السلة وتطابق الأسعار
│   │   │   ├── categories/          # GET الفئات العامة للمتجر
│   │   │   ├── checkout/
│   │   │   │   └── session/         # POST إنشاء جلسة Checkout وحجز المخزون وربط الدفع
│   │   │   ├── coupons/
│   │   │   │   └── validate/        # POST التحقق من شروط الكوبون وحساب قيمة الخصم
│   │   │   ├── cron/
│   │   │   │   └── expire-orders/   # GET مهمة دورية لإنهاء الطلبات المنتهية وتحرير المخزون المحجوز
│   │   │   ├── notifications/       # واجهات الإشعارات
│   │   │   │   ├── email/           # نقاط نهاية البريد
│   │   │   │   └── whatsapp/        # بنية تحتية لـ WhatsApp (V2)
│   │   │   ├── orders/              # GET قائمة طلبات العميل المسجل
│   │   │   │   └── [id]/            # GET تفاصيل طلب العميل
│   │   │   │       └── cancel/      # POST إلغاء العميل لطلبه مع تحرير المخزون والاسترداد
│   │   │   ├── products/            # GET قائمة المنتجات العامة مع البحث والفلترة
│   │   │   │   ├── [slug]/          # GET تفاصيل منتج معين بالـ slug
│   │   │   │   │   └── reviews/     # GET مراجعات المنتج العامة مع الملخص وحالة الزائر
│   │   │   │   └── facets/          # GET حدود الأسعار والفئات المتاحة ديناميكياً
│   │   │   ├── reviews/             # POST إضافة مراجعة جديدة مع التحقق من الشراء
│   │   │   ├── shipping/
│   │   │   │   └── calculate/       # GET حاسبة رسوم وأيام الشحن حسب الدولة
│   │   │   ├── webhooks/
│   │   │   │   ├── stripe/          # POST معالج إشعارات Stripe الموقعة رقمياً
│   │   │   │   └── local-gateway/   # POST معالج إشعارات البوابة الخليجية مع إرسال بريد التأكيد
│   │   │   └── wishlist/            # GET (قائمة المفضلة أو المعرفات)، POST (إضافة)، DELETE (حذف)
│   │   ├── globals.css              # ملف التنسيق العام و Tailwind
│   │   ├── layout.tsx               # Root Layout
│   │   ├── providers.tsx            # مزودي الواجهة وحاوية TanStack Query Client
│   │   ├── robots.ts                # توليد robots.txt ديناميكياً مع حظر المسارات الحساسة
│   │   ├── sitemap.ts               # توليد sitemap.xml ديناميكياً مع روابط المنتجات والأصناف
│   │   └── page.tsx                 # الصفحة الرئيسية (Landing Page)
│   ├── components/                  # مكونات الواجهة
│   │   ├── admin/                   # مكونات الإدارة (CategoriesTable, CategoryForm, DashboardStats, OrderDetail, OrdersTable, ProductForm, ProductsTable, ReviewsTable)
│   │   ├── atoms/                   # أصغر العناصر (Button, Text, Title, Icon, Images)
│   │   ├── molecules/               # عناصر مركبة (SearchBox, NavItem, FormField)
│   │   ├── organisms/               # هياكل كاملة (Navbar, Footer)
│   │   ├── seo/                     # مكونات محركات البحث
│   │   │   └── JsonLd.tsx           # حقن بيانات Schema.org بأمان وسرعة
│   │   ├── shop/                    # مكونات المتجر (CartDrawer, CountrySelector, CurrencySelector, ProductCard, ProductReviews, WishlistButton...)
│   │   ├── checkout/                # مكونات الدفع والشحن (PaymentMethodPicker, ShippingCalculator, VatField)
│   │   ├── layout/                  # مكونات التخطيط واللغات
│   │   └── ui/                      # مكونات الأساس المشتركة (Dialog, Dropdown, Skeleton, OrderStatusBadge, OrderTimeline)
│   ├── hooks/                       # الخطافات المخصصة (useAdminReports, useCart, useCartAuthSync, useCountry, useOrders, useProducts, useProductFiltersUrl, useReviews, useWishlist)
│   ├── lib/                         # المكتبات المشتركة والأدوات المساعدة
│   │   ├── api-error.ts             # فئات أخطاء الـ API الموحدة ودالة handleApiError
│   │   ├── api-response.ts          # دوال التنسيق القياسي للاستجابات (ok, fail, validationError)
│   │   ├── auth.ts                  # تكوين NextAuth
│   │   ├── cart-merge.ts            # منطق دمج سلة الزائر مع سلة المستخدم في التخزين المحلي
│   │   ├── cn.tsx                   # دمج كلاسات Tailwind
│   │   ├── currency.ts              # تحويل العملات وتنسيق الوحدات الصغرى
│   │   ├── email.ts                 # عميل Resend لإرسال الرسائل الإلكترونية مع آلية fallback
│   │   ├── gcc-currency.ts          # أسعار صرف الخليج والتعامل الخاص مع العملات ثلاثية الخانات (KWD, BHD, OMR)
│   │   ├── get-error-message.ts     # استخراج رسائل الأخطاء الآمنة
│   │   ├── order-format.ts          # تنسيق العملات والتواريخ عبر Native Intl (يدعم KWD/BHD/OMR)
│   │   ├── password.ts              # تشفير وفحص كلمات المرور عبر Argon2id
│   │   ├── payment-gateway.ts       # عملاء HTTP منخفضو المستوى لـ Tap و Moyasar
│   │   ├── prisma.ts                # Prisma Client Singleton مع مشغل PrismaPg Driver Adapter
│   │   ├── rate-limit.ts            # تقييد معدل الطلبات متعدد الطبقات عبر Upstash Redis (Edge & Route Limiters)
│   │   ├── require-admin.ts         # حماية المسارات الإدارية والتحقق من صلاحية ADMIN
│   │   ├── require-user.ts          # التحقق من جلسة العميل واستخراج معرفه
│   │   ├── shipping-rates.ts        # جدول أسعار الشحن والبلدان المدعومة
│   │   ├── site.ts                  # ثوابت الموقع وتوليد الروابط المطلقة للـ SEO
│   │   └── stripe.ts                # تهيئة Stripe SDK
│   ├── modules/                     # طبقة منطق الأعمال والوصول لقاعدة البيانات (Modular Monolith)
│   │   ├── addresses/               # مستودع وخدمة العناوين (address.repository.ts, address.service.ts, address.validators.ts)
│   │   ├── auth/                    # خدمة ومتحققات المصادقة (auth.service.ts, auth.validators.ts)
│   │   ├── cart/                    # خدمة التحقق من السلة (cart.service.ts, cart.validators.ts)
│   │   ├── categories/              # مستودع وخدمة الفئات (category.repository.ts, category.service.ts, category.validators.ts)
│   │   ├── checkout/                # خدمة ومستودع إتمام الشراء وحجز المخزون (checkout.service.ts, checkout.repository.ts, checkout.validators.ts)
│   │   ├── coupons/                 # خدمة ومستودع فحص الكوبونات (coupon.service.ts, coupon.repository.ts, coupon.validators.ts)
│   │   ├── notifications/           # خدمة إشعارات البريد وتأكيد الطلبات (repository, service, templates, tests)
│   │   ├── orders/                  # إدارة دورة حياة الطلبات والمخزون والاسترداد (state machine, adapter, repository, service, validators, tests)
│   │   ├── payments/                # طبقة الدفع الموحدة ومزودو البوابات (Stripe, Tap, Moyasar, Local Provider, tests)
│   │   ├── products/                # مستودع وخدمة المنتجات (product.repository.ts, product.service.ts, product.validators.ts)
│   │   ├── reports/                 # خدمة ومستودع تقارير الإدارة والمبيعات (report.repository.ts, report.service.ts, report.validators.ts)
│   │   ├── reviews/                 # خدمة ومستودع تقييمات المنتجات والاعتدال (review.repository.ts, review.service.ts, review.validators.ts)
│   │   ├── seo/                     # خدمة ومستودع محركات البحث والبيانات المهيكلة
│   │   │   ├── seo.repository.ts    # استعلامات Prisma لكاش الـ SEO و Sitemap
│   │   │   └── seo.service.ts       # بناء الـ Metadata و JSON-LD للمنتجات والفئات
│   │   ├── shipping/                # خدمة ومتحققات الشحن (shipping.service.ts, shipping.validators.ts)
│   │   └── wishlist/                # خدمة ومستودع قائمة الرغبات (wishlist.repository.ts, wishlist.service.ts, wishlist.validators.ts)
│   ├── middleware.ts                # طبقة الحماية المتكاملة (Rate Limiting + Admin/Customer Guards)
│   ├── providers/                   # مزودي التطبيق (AppProviders.tsx)
│   ├── services/                    # طبقة استدعاء الـ API من الواجهة الأمامية (products, categories, orders, reviews, wishlist, reports)
│   ├── store/                       # مخازن الحالة العامة (cart-store.ts)
│   ├── styles/                      # متغيرات نظام التصميم (variables.css)
│   └── types/                       # تعريفات TypeScript العامة (cart.d.ts, next-auth.d.ts, global.d.ts)
├── next.config.ts                   # إعدادات Next.js وترويسات الأمان الصارمة (CSP, HSTS, X-Frame-Options...)
├── vercel.json                      # تكوين مهام Cron المجدولة (expire-orders كل 15 دقيقة)
└── package.json
```

---

## 🗄️ 4. مخطط قاعدة البيانات الشامل (Database Schema - Prisma)

المخطط المعتمد والمنفذ في [prisma/schema.prisma](file:///c:/Users/aboba/OneDrive/Desktop/alzainTea/prisma/schema.prisma):

```prisma
// ============================================================================
// Enums
// ============================================================================
enum Role { CUSTOMER ADMIN SUPER_ADMIN }
enum OrderStatus { PENDING CONFIRMED PROCESSING SHIPPED DELIVERED CANCELLED RETURNED REFUNDED FAILED }
enum PaymentStatus { UNPAID PAID FAILED REFUNDED PENDING }
enum DiscountType { PERCENTAGE FIXED }
enum ReviewStatus { PENDING APPROVED REJECTED }
enum ProductStatus { DRAFT ACTIVE ARCHIVED OUT_OF_STOCK }

// ============================================================================
// Models
// ============================================================================
model User {
  id            String         @id @default(cuid())
  name          String
  email         String         @unique
  password      String?        // مشفر عبر Argon2id (nullable لدعم OAuth مستقبلاً)
  role          Role           @default(CUSTOMER)
  emailVerified DateTime?
  orders        Order[]
  addresses     Address[]
  reviews       Review[]
  wishlist      WishlistItem[]
  couponUsages  CouponUsage[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([email])
}

model Category {
  id          String     @id @default(cuid())
  nameAr      String
  nameEn      String
  slug        String     @unique
  description String?
  image       String?
  parentId    String?    // شجرة فئات ذاتية الارتباط (Self-relation)
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([parentId])
}

model Brand {
  id       String    @id @default(cuid())
  nameAr   String
  nameEn   String
  slug     String    @unique
  logo     String?
  products Product[]
}

model Product {
  id             String           @id @default(cuid())
  nameAr         String
  nameEn         String
  slug           String           @unique
  descAr         String
  descEn         String
  price          Decimal          @db.Decimal(10, 2) // السعر الأساسي بالدولار USD
  compareAtPrice Decimal?         @db.Decimal(10, 2) // السعر قبل الخصم
  stock          Int              @default(0)
  reservedStock  Int              @default(0)        // الكمية المحجوزة أثناء عمليات الدفع
  sku            String           @unique
  images         String[]
  status         ProductStatus    @default(DRAFT)
  categoryId     String
  category       Category         @relation(fields: [categoryId], references: [id])
  brandId        String?
  brand          Brand?           @relation(fields: [brandId], references: [id])
  variants       ProductVariant[]
  orderItems     OrderItem[]
  reviews        Review[]
  wishlistedBy   WishlistItem[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([categoryId])
  @@index([status])
  @@index([slug])
  @@index([status, categoryId])   // فلترة الكتالوج حسب الفئة
  @@index([status, createdAt])    // ترتيب الأحدث
}

model ProductVariant {
  id         String      @id @default(cuid())
  productId  String
  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  name       String      // مثال: "علبة 250غ" أو "شاي سيلاني فاخر"
  sku        String      @unique
  price      Decimal?    @db.Decimal(10, 2) // سعر مخصص للمتغير (اختياري)
  stock      Int         @default(0)
  orderItems OrderItem[]

  @@index([productId])
}

model Order {
  id                String           @id @default(cuid())
  userId            String?
  user              User?            @relation(fields: [userId], references: [id])
  guestEmail        String?
  status            OrderStatus      @default(PENDING)
  paymentMethod     String           // "stripe" | "tap" | "moyasar"
  paymentStatus     PaymentStatus    @default(UNPAID)
  paymentRef        String?          @unique
  currency          String
  subtotal          Decimal          @db.Decimal(10, 2)
  discount          Decimal          @default(0) @db.Decimal(10, 2)
  shippingCost      Decimal          @db.Decimal(10, 2)
  tax               Decimal          @db.Decimal(10, 2)
  total             Decimal          @db.Decimal(10, 2)
  country           String
  vatNumber         String?
  notes             String?
  couponId          String?
  coupon            Coupon?          @relation(fields: [couponId], references: [id])
  shippingAddressId String?
  shippingAddress   Address?         @relation(fields: [shippingAddressId], references: [id])
  items             OrderItem[]
  statusHistory     OrderStatusLog[]
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  confirmationEmailSentAt DateTime?  // حجز ذري يمنع إرسال بريد تأكيد الطلب مرتين

  @@index([userId, createdAt])                       // استعراض طلبات العميل مرتبة بالأحدث
  @@index([status])
  @@index([paymentStatus])
  @@index([paymentStatus, createdAt])                // تقارير وتحليلات المبيعات الزمنية
  @@index([status, paymentStatus, createdAt])        // مهمة Cron لإنهاء الطلبات المنتهية دورياً
}

model OrderItem {
  id        String          @id @default(cuid())
  orderId   String
  order     Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product         @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  quantity  Int
  price     Decimal         @db.Decimal(10, 2) // لقطة لسعر الشراء وقت الدفع

  @@index([orderId])
  @@index([productId])
}

model OrderStatusLog {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())

  @@index([orderId])
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName   String
  phone      String
  country    String
  city       String
  street     String
  postalCode String?
  isDefault  Boolean @default(false)
  orders     Order[]

  @@index([userId])
}

model Coupon {
  id                String        @id @default(cuid())
  code              String        @unique
  type              DiscountType
  value             Decimal       @db.Decimal(10, 2)
  minOrderAmount    Decimal?      @db.Decimal(10, 2)
  maxDiscountAmount Decimal?      @db.Decimal(10, 2)
  usageLimit        Int?
  usageLimitPerUser Int?          @default(1)
  usedCount         Int           @default(0)
  isActive          Boolean       @default(true)
  startsAt          DateTime?
  expiresAt         DateTime?
  orders            Order[]
  usages            CouponUsage[]
  createdAt         DateTime      @default(now())
}

model CouponUsage {
  id       String   @id @default(cuid())
  couponId String
  coupon   Coupon   @relation(fields: [couponId], references: [id])
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  usedAt   DateTime @default(now())

  @@unique([couponId, userId, usedAt])
}

model Review {
  id               String       @id @default(cuid())
  productId        String
  product          Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId           String
  user             User         @relation(fields: [userId], references: [id])
  rating           Int          // من 1 إلى 5
  comment          String?
  status           ReviewStatus @default(PENDING)
  verifiedPurchase Boolean      @default(false)
  createdAt        DateTime     @default(now())

  @@unique([productId, userId])
  @@index([status])
  @@index([userId])
  @@index([productId, status])   // تجميع التقييمات المعتمدة للمنتج
}

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  addedAt   DateTime @default(now())

  @@unique([userId, productId])
}
```

---

## 🏛️ 5. معايير الهيكلة وطبقات الـ Backend المعتمدة

### أ. مسؤوليات الطبقات (Layered Architecture):
1. **Route Handler (`src/app/api/.../route.ts`)**:
   - استقبال طلب الـ HTTP واستخراج البارامترات أو الـ Body.
   - **التعامل مع بارامترات المسار غير التزامنية (Async Params)**: في Next.js 15/16، حقل `params` في دالة المسار أصبح وعداً (`Promise`)؛ لذا يجب انتظاره صراحة عبر `const { id } = await context.params`.
   - التحقق من الصلاحية، الجلسة، وتقييد معدل الطلبات (Rate Limiting).
   - التحقق من هيكل البيانات عبر `Zod Schema`.
   - استدعاء دالة الـ Service المناسبة.
   - إرجاع الرد عبر `ok(data, meta)` أو اصطياد الخطأ عبر `fail(error)`.
   - **قاعدة صارمة**: يُمنع منعاً باتاً كتابة منطق أعمال أو استعلامات Prisma مباشرة داخل Route Handler.

2. **Validators (`src/modules/*/*.validators.ts`)**:
   - مخططات Zod صارمة للمدخلات والبحث والإنشاء والتعديل.
   - تضمن رسائل خطأ واضحة باللغة العربية وتوافق الأنواع مع TypeScript تلقائياً.

3. **Service (`src/modules/*/*.service.ts`)**:
   - منطق الأعمال النقي (Business Logic): فحص تكرار البريد، حساب الأسعار، التحقق من المخزون، معالجة السلال، فحص الكوبونات، وإنشاء جلسات الدفع، وإرسال الإشعارات.
   - لا تتعامل مع كائنات `Request` أو `Response` الخاصة بـ HTTP.

4. **Repository (`src/modules/*/*.repository.ts`)**:
   - الطبقة الوحيدة المسموح لها باستدعاء `prisma` واستعلامات قاعدة البيانات.
   - تقوم بالفلترة، الترقيم (Pagination)، وإجراء المعاملات الذرية (`$transaction`).

### ب. صيغة الاستجابة الموحدة ومعالجة الأخطاء (`src/lib/api-response.ts` & `api-error.ts`):
- **النجاح (Success Response):**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "totalPages": 4, "total": 45 }
  }
  ```
- **الفشل والخطأ (Error Response):**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "بيانات غير صالحة",
      "statusCode": 400
    }
  }
  ```
- **معالجة الأخطاء المركزية (`handleApiError` عبر `fail(error)`):**
  - **`ApiError`**: إرجاع رمز الخطأ المخصص والحالة المحددة (مثل `404 PRODUCT_NOT_FOUND`, `409 CART_INVALID`, `403 PURCHASE_REQUIRED`).
  - **`ZodError`**: تحويل أخطاء التحقق إلى `400 VALIDATION_ERROR` مع أول رسالة خطأ صريحة.
  - **`Prisma Client Known Errors`**:
    - `P2002` $\longrightarrow$ تحويل تعارض القيود الفريدة إلى `409 CONFLICT` (مثل تكرار البريد أو تكرار تقييم المنتج).
    - `P2025` $\longrightarrow$ تحويل فشل وجود السجل إلى `404 NOT_FOUND`.
  - **الأخطاء الداخلية غير المتوقعة**: تسجيل تفاصيل الخطأ في خادم التطوير/الـ Logs مع إرجاع استجابة آمنة `500 INTERNAL_ERROR` ("حدث خطأ غير متوقع، يرجى المحاولة لاحقاً") لمنع تسريب بيانات البنية التحتية للعميل.

---

## 🛒 6. تفاصيل أنظمة السلة والكتالوج المنجزة (Weeks 1-3 Details)

### أ. نظام سلة المشتريات والدمج الذكي (Cart & Merge System):
- **مخزن Zustand (`src/store/cart-store.ts`)**:
  - تخزين محلي يعتمد على مفاتيح ديناميكية: `alzain-cart-storage:guest` للزائر، و `alzain-cart-storage:{userId}` للمستخدم المسجل.
  - لا يعتمد على مفتاح ثابت وحيد، لمنع اختلاط سلة الزائر مع حسابات متعددة على نفس المتصفح.
- **منطق الدمج ومزامنة المصادقة (`src/lib/cart-merge.ts` + `useCartAuthSync.ts`)**:
  - عند تسجيل الدخول، يُستدعى `mergeGuestCartIntoUser(userId)`.
  - تُدمج عناصر سلة الزائر مع أي سلة محفوظة سابقاً للمستخدم: تجمع الكميات للبنود المتطابقة ويُعتمد السعر الأحدث، وتُفرغ سلة الزائر لمنع التكرار.
  - عند تسجيل الخروج، يُعاد التبديل إلى سلة زائر نظيفة عبر `switchToGuestCart()`.
- **التحقق الخادمي من السلة (`POST /api/cart/validate`)**:
  - تستدعيها الواجهة قبل التوجه للدفع (`useCart().validateCart()`).
  - تفحص توفر المخزون الحي (`stock - reservedStock`) ومطابقة الأسعار الحالية.
  - تُرجع تحديثاً للكميات والأسعار الحقيقية مع قائمة بالملاحظات (`CartValidationIssue`).

### ب. نظام الكتالوج، البحث، الفلاتر والـ Facets:
- **البحث والفلترة (`src/hooks/useProductFiltersUrl.ts`)**:
  - مزامنة فورية للبحث النصي `q`، الفئة `category`، أدنى/أعلى سعر `minPrice`/`maxPrice`، حالة التوفر `inStock`، والترتيب `sort` مع الـ Query String في الرابط.
  - بحث نصي بتأخير زمني (Debounce 300ms) عبر `ProductSearch.tsx`.
- **نقطة نهاية الـ Facets (`GET /api/products/facets`)**:
  - تحسب الفئات المتاحة وعدد المنتجات في كل فئة، والحد الأدنى والأقصى لأسعار المنتجات المطابقة للبحث الحالي لدعم سلاسة تجربة المستخدم في شريط الفلاتر.
- **التخزين المؤقت والترقيم (Pagination)**:
  - استعلامات الواجهة مدعومة بـ TanStack Query مع `staleTime: 60s` ومكون ترقيم متجاوب `Pagination.tsx`.

### ج. لوحة تحكم المنتجات والفئات (Admin CRUD):
- شاشات مكتملة لإدارة المنتجات والفئات تحت `/admin/products` و `/admin/categories`.
- نماذج متقدمة للإنشاء والتعديل (`ProductForm.tsx`, `CategoryForm.tsx`) تدعم اللغتين (عربي/إنجليزي)، الفئات الهرمية (Parent/Child Categories)، والصور والـ SKU.
- الجداول تدعم الفلترة، الحذف والتفعيل السريع مع تأكيد العمليات.

---

## 💳 7. تفاصيل إتمام الشراء، حجز المخزون، والعناوين والكوبونات (Week 4 Details)

### أ. تدفق إتمام الشراء الخادمي الموحد (`src/modules/checkout/checkout.service.ts`):
يتم إنشاء الطلب عبر مسار `POST /api/checkout/session` باتباع خطوات صارمة:
1. **إعادة التحقق من السلة خادمياً (`validateCart`)**: لا يُعتمد أبداً على الأسعار أو الكميات القادمة من المتصفح كـ Source of Truth. إذا وُجد تعارض في السعر أو المخزون، يُرفض الطلب فوراً برمز `409 CART_INVALID`.
2. **احتساب الشحن (`calculateShipping`)**: التحقق من دعم الدولة وتحديد التكلفة ومدة التوصيل عبر `src/modules/shipping/shipping.service.ts`.
3. **تحديد البوابة والعملة (`resolveGateway`)**: اختيار البوابة الخليجية لدول الخليج مع عملتها الوطنية، أو Stripe بالدولار لبقية العالم.
4. **التحقق من الكوبون (`validateCoupon`)**: فحص شروط الكوبون وتطبيق الخصم (نسبة مئوية أو مبلغ ثابت مع مراعاة السقف الأقصى `maxDiscountAmount`).
5. **التحقق من عنوان الشحن**: للمستخدم المسجل يتم التحقق الصارم من ملكية العنوان (`assertAddressOwnership`) لمنع التلاعب بمعرفات العناوين. للزائر يتم التحقق من بيانات العنوان والبريد الإلكتروني (`guestAddress`, `guestEmail`).
6. **تحويل العملات وحساب الضريبة (VAT)**: تحويل كل بند بالدولار إلى العملة المعتمدة للطلب، ثم احتساب الضريبة (مثلاً 15% للسعودية، 5% للإمارات وعمان، 20% لبريطانيا) على الصافي بعد الخصم `(subtotal - discount)` بدقة تفادياً للتقريب التراكمي.
7. **إنشاء الطلب وحجز المخزون ذرياً (`createOrderWithStockReservation`)**:
   - تُنفذ العملية بالكامل داخل **معاملة Prisma واحدة (`prisma.$transaction`)**.
   - **المنتجات العادية**: يتم زيادة `reservedStock` بالكمية المطلوبة مع فحص شرط `stock - reservedStock >= quantity`.
   - **المتغيرات (Variants)**: يتم خصم الكمية مباشرة من حقل `stock` في جدول `ProductVariant`.
   - يتم إنشاء سجل الطلب بحالة `PENDING` وحالة دفع `UNPAID` مع إضافة سجل زمني في `OrderStatusLog`.
8. **إنشاء جلسة الدفع (Payment Session)**: استدعاء مزود الدفع المناسب وتوليد رابط جلسة الدفع `checkoutUrl`.

### ب. نظام العناوين (`src/modules/addresses/`):
- يدعم استرجاع عناوين العميل، إضافة عنوان جديد، تعديل، وحذف.
- عند تعيين عنوان كافتراضي (`isDefault: true`)، يتم تصفير الحالة الافتراضية للعناوين السابقة تلقائياً (`clearDefaultAddresses`).
- مسارات الـ API: `GET /api/addresses`, `POST /api/addresses`, `PATCH /api/addresses/[id]`, `DELETE /api/addresses/[id]`.

### ج. محرك الكوبونات (`src/modules/coupons/`):
- مسار الفحص المباشر: `POST /api/coupons/validate` مع معالجة الأخطاء برموز دقيقة (`422`):
  - `COUPON_NOT_FOUND`: الكود غير موجود أو غير مفعل.
  - `COUPON_NOT_STARTED` / `COUPON_EXPIRED`: التحقق من النافذة الزمنية للصلاحية.
  - `COUPON_LIMIT_REACHED`: استنفاد الحد الأقصى الكلي للاستخدام (`usageLimit`).
  - `COUPON_USER_LIMIT_REACHED`: فحص تكرار الاستخدام لنفس المستخدم عبر جدول `CouponUsage`.
  - `COUPON_MIN_ORDER_NOT_MET`: فحص الحد الأدنى لقيمة السلة.

---

## ⚡ 8. نظام الدفع المزدوج والتوجيه الذكي والـ Webhooks (Week 5 Details)

تم إنجاز منظومة الدفع المزدوجة بالكامل لربط السوق الخليجي المحلي بالأسواق العالمية عبر معمارية Adapter/Strategy مرنة وآمنة للغاية:

### أ. التوجيه الذكي للبوابات والـ Feature Flag (`src/modules/payments/payment.service.ts`):
- **قاعدة التوجيه التلقائي (`resolveGateway(country)`)**:
  - دول مجلس التعاون الخليجي الست (`SA`, `AE`, `OM`, `KW`, `BH`, `QA`) يتم توجيهها تلقائياً إلى **البوابة المحلية** بالعملة الرسمية للدولة.
  - كافة الدول الأخرى (مثل `US`, `GB`, `DE` وغيرها) يتم توجيهها إلى **Stripe Checkout** بالدولار الأمريكي (`USD`).
- **التبديل عبر الـ Feature Flag (`getActiveLocalGateway()`)**:
  - يدعم المتجر بوابتي **Tap Payments** و **Moyasar** بكود كامل ومختبر.
  - يتم اختيار البوابة النشطة في أي لحظة عبر متغير البيئة `PAYMENT_PROVIDER` (`tap` أو `moyasar`).
  - **التبديل الفوري دون تعديل كود**: يمكن للمتجر التبديل من Tap إلى Moyasar أو العكس بمجرد تعديل المتغير في `.env` وإعادة توجيه الـ Webhook في لوحة المزود إلى الرابط الموحد `/api/webhooks/local-gateway`.

### ب. مزود Tap Payments (`src/modules/payments/providers/tap.provider.ts`):
- **إنشاء الجلسة**: يتم استخدام `source: { id: "src_all" }` لتمكين العميل من اختيار أي طريقة دفع محلية مفعّلة على حساب التاجر (Apple Pay، بطاقات مدى mada، كي نت KNET، بنفت Benefit، بطاقات فيزا وماستركارد).
- **التحقق المشفر من الـ Webhook**:
  - قراءة الـ `hashstring` من جسم حدث الـ Webhook.
  - إعادة احتساب توقيع HMAC-SHA256 باستخدام `LOCAL_GATEWAY_WEBHOOK_SECRET` وفق الصيغة المعتمدة لبيانات المعاملة.
  - المقارنة الزمنية الثابتة `crypto.timingSafeEqual` لمنع هجمات التوقيت (Timing Attacks).
- **الاسترداد (Refund)**: تنفيذ استرداد كامل للمدفوعات عبر `refundTapCharge`.

### ج. مزود Moyasar (`src/modules/payments/providers/moyasar.provider.ts`):
- **إنشاء المعاملة**: دعم الدفع المباشر بالهللات مع تحويل تلقائي عبر HTTP client منخفض المستوى في `src/lib/payment-gateway.ts`.
- **التحقق الأمني من الـ Webhook**:
  - التحقق من صحة `secret_token` القادم ضمن جسم الحدث بمقارنته مع `LOCAL_GATEWAY_WEBHOOK_SECRET` باستخدام `crypto.timingSafeEqual`.
- **الاسترداد (Refund)**: دعم الاسترداد الكلي والجزئي بنفس وحدات العملة الصغرى (`refundMoyasarPayment`).

### د. معالجة عملات الخليج والكسور الثلاثية (`src/lib/gcc-currency.ts`):
- **العملات ثلاثية الخانات العشرية (3-Decimal Currencies)**:
  - الدينار الكويتي (`KWD`)، الريال العماني (`OMR`)، والدينار البحريني (`BHD`) تتطلب 3 خانات عشرية (1000 فلس/بيسة).
  - تم بناء دوال مخصصة `decimalPlacesFor` و `roundForCurrency` و `toMinorUnits` تراعي هذه الخصوصية وتمنع تماماً أخطاء التقريب المالي.
- **تحويل الأسعار من الدولار إلى العملة المحلية**:
  - المنتجات تُسعر وتُخزن بالدولار (`USD`) كمصدر حقيقة وحيد.
  - تُحول كل العناصر (المجموع، الخصم، الشحن، الضريبة) إلى العملة المحلية أولاً ثم يُحسب الإجمالي النهائي لتفادي تراكم الفروقات.

### هـ. معالجات الـ Webhooks المزدوجة وضمان الـ Idempotency وتحرير المخزون:
1. **مسار البوابة المحلية (`POST /api/webhooks/local-gateway`)**:
   - يستقبل إشعارات البوابة المفعلة (Tap أو Moyasar) ويتحقق من التوقيع.
   - **عند نجاح الدفع (`PAID`)**: فحص هل الطلب مدفوع مسبقاً عبر `findOrderByPaymentRef`، ثم استدعاء `markOrderPaid(orderId, gatewayLabel)` الذي يخصم `stock` ويصفر `reservedStock` ويحدّث الحالة إلى `CONFIRMED`.
   - **عند فشل الدفع (`FAILED`)**: استدعاء `releaseReservedStock` لتحرير المخزون المحجوز فوراً.
2. **مسار Stripe Webhook (`POST /api/webhooks/stripe`)**:
   - التحقق المشفر من ترويسة `stripe-signature` عبر SDK.
   - معالجة `checkout.session.completed` لتأكيد الدفع بشكل Idempotent.
   - معالجة `checkout.session.expired` لتحرير المخزون المحجوز فوراً دون انتظار تدخل يدوي.
3. **تحرير المخزون الذري المحمي (`releaseReservedStock`)**:
   - يعمل داخل `prisma.$transaction`.
   - للمنتجات العادية: يطرح الكمية من `reservedStock` لتعود متاحة للبيع فوراً.
   - للمتغيرات (Variants): يضيف الكمية مجدداً إلى `stock`.
   - يسجل سبب الإلغاء في `OrderStatusLog`، ويمنع تحرير المخزون مرتين لنفس الطلب.

### و. اختبارات دورة الدفع الآلية (`src/modules/payments/__tests__/payment-cycle.test.ts`):
مجموعة اختبارات شاملة باستخدام Vitest تم فيها محاكاة (Mocking) لكل من Stripe SDK و Tap و Moyasar وقاعدة البيانات:
1. **اختبار توجيه البوابات**: التأكد من توجيه الدول غير الخليجية لـ Stripe، وتوجيه دول الخليج لـ Tap أو Moyasar وفق متغير البيئة، ورمي استثناء صريح عند وضع قيمة غير مدعومة.
2. **اختبار توقيع Tap**: التأكد من قبول التوقيع السليم ورفض أي حدث تم التلاعب بقيمته (حتى لو بقي التوقيع القديم).
3. **اختبار Moyasar secret_token**: التأكد من قبول التوكن المطابق ورفض التوكنات الخاطئة.
4. **اختبار عدم التكرار (Idempotency)**:
   - استدعاء `markOrderPaid` مرتين متتاليتين يضمن عدم خصم المخزون مرتين.
   - استدعاء `releaseReservedStock` مرتين متتاليتين يضمن عدم إعادة المخزون مرتين.

---

## 📦 9. تفاصيل دورة حياة الطلبات، إدارة المخزون، الاسترداد المالي، ولوحة الإدارة (Week 6 Details)

تم إنجاز منظومة دورة حياة الطلبات (Orders Lifecycle) وإدارتها في لوحة التحكم وبوابة العميل بالكامل وفق أعلى معايير الأمان المالي والنزاهة المحاسبية للمخزون:

### أ. آلة حالات الطلب وانتقالات الحالات الصارمة (`src/modules/orders/order-status.ts`):
- **مصفوفة الانتقالات المسموحة (`ORDER_TRANSITIONS`)**:
  - `PENDING` $\longrightarrow$ `["CONFIRMED", "CANCELLED", "FAILED"]`
  - `CONFIRMED` $\longrightarrow$ `["PROCESSING", "CANCELLED"]`
  - `PROCESSING` $\longrightarrow$ `["SHIPPED", "CANCELLED"]`
  - `SHIPPED` $\longrightarrow$ `["DELIVERED", "RETURNED"]`
  - `DELIVERED` $\longrightarrow$ `["RETURNED", "REFUNDED"]`
  - `RETURNED` $\longrightarrow$ `["REFUNDED"]`
- **الحالات النهائية (Terminal States)**:
  - `CANCELLED`, `REFUNDED`, `FAILED` — حالات نهائية محصورة ومغلقة لا تسمح بأي انتقال بعدها منعاً للتلاعب (`isTerminalStatus`).
- **تحديد الصلاحيات الموجهة (Role-Based State Transitions)**:
  - **حالات Webhooks و Cron فقط**: `PENDING`, `CONFIRMED`, `FAILED` تُدار آلياً بواسطة إشعارات بوابات الدفع أو مهمة إنهاء الطلبات المنتهية.
  - **حالات المدير المسموحة (`ADMIN_SETTABLE_STATUSES`)**: `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`, `REFUNDED`.
  - **حالات إلغاء العميل (`CUSTOMER_CANCELLABLE_STATUSES`)**: مسموح للعميل إلغاء طلبه فقط إذا كان في حالة `PENDING` (بانتظار الدفع) أو `CONFIRMED` (مدفوع وبانتظار بدء التجهيز)، ويُمنع الإلغاء الذاتي بعد الدخول في `PROCESSING`.

### ب. خطة الانتقال وتأثيرات المخزون الذرية (`planTransition` & `StockEffect`):
- **أنواع التأثير على المخزون (`StockEffect`)**:
  1. `NONE`: لا تأثير على المخزون (مثل الانتقال من `CONFIRMED` إلى `PROCESSING` ثم `SHIPPED`).
  2. `RELEASE_RESERVED`: للطلبات غير المدفوعة الملغاة أو الفاشلة — تحرير الكميات من `reservedStock` للمنتجات العادية، وإعادتها إلى `stock` للمتغيرات (`ProductVariant`).
  3. `RESTOCK`: للطلبات المدفوعة الملغاة أو المرتجعة التي يقرر إعادتها للمخزون — زيادة رصيد `stock` الفعلي للمنتجات والمتغيرات.
- **منع حالات الجمود الميت (Deadlock Prevention)**:
  - فرز بنود الطلب أبجدياً حسب معرف المنتج والمتغير (`productId:variantId`) قبل تنفيذ استعلامات التحديث في قاعدة البيانات، لضمان تسلسل ثابت للأقفال عند معالجة طلبات متزامنة.
- **التزامن التفاؤلي الصارم (Optimistic Concurrency & Compare-and-Set)**:
  - يُنفذ الانتقال داخل معاملة ذرية `prisma.$transaction` باستخدام تحديث شرطي:
    `prisma.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } })`
  - إذا كان `count === 0`، يرمي النظام خطأ `409 ORDER_STATE_CONFLICT`، مما يمنع حدوث Race Conditions بين نقرات متعددة أو بين المشرف والـ Webhook.
- **سجل التدقيق الزمني الشامل (`OrderStatusLog`)**:
  - كل تغيير في الحالة يسجل تلقائياً مع طابع زمني وهوية الفاعل: `[admin:userId]`, `[customer:userId]`, أو `[system]`.

### ج. حماية الاسترداد المالي وقفل التزامن (Refund Concurrency Lock & Adapter):
- **قفل الاسترداد الذري (`claimRefund` / `revertRefundClaim`)**:
  - قبل استدعاء بوابة الدفع الخارجية، يقوم النظام بحجز عملية الاسترداد بتحويل `paymentStatus` من `PAID` إلى `PENDING` شرطياً (`updateMany where paymentStatus = "PAID"`).
  - إذا سبقت عملية أخرى هذا الطلب، يفشل الحجز فوراً برمز `409 REFUND_IN_PROGRESS`، مما يمنع النقر المزدوج واسترداد المبلغ مرتين.
  - في حال تعثر الاتصال ببوابة الدفع، يُلغى الحجز تلقائياً (`revertRefundClaim`) لتعود الحالة إلى `PAID`.
- **مهايئ الاسترداد المالي (`src/modules/orders/order-refund.adapter.ts`)**:
  - عزل منطق الطلبات عن تفاصيل بوابات الدفع؛ حيث يستدعي `refundPayment` الموحدة في موديول الدفع بكامل قيمة الطلب وبالعملة الأصلية.

### د. إلغاء العميل لطلبه وحماية الخصوصية (`POST /api/orders/[id]/cancel`):
- فحص الجلسة عبر `requireUser()`، والتحقق الصارم من ملكية العميل للطلب (`order.userId === user.id`).
- إرجاع خطأ `404 ORDER_NOT_FOUND` (بدل 403) إذا لم يكن الطلب للمستخدم، لمنع استكشاف وجود طلبات المستخدمين الآخرين (ID Enumeration).
- إذا كان الطلب مدفوعاً، يتم بدء الاسترداد المالي آلياً وتحرير المخزون.

### هـ. الجدولة الآلية لإنهاء الطلبات المعلقة وتحرير المخزون (Vercel Cron):
- **نقطة النهاية المجدولة (`GET /api/cron/expire-orders`)**:
  - محمية بمطابقة سرية ثابتة التوقيت (`timingSafeEqual`) لترويسة `Authorization: Bearer $CRON_SECRET`.
  - تستدعي `expireStalePendingOrders(60)` للبحث عن الطلبات في حالة `PENDING` و `UNPAID` التي تجاوز عمرها 60 دقيقة.
  - تنقل حالتها ذرياً إلى `FAILED`، وتحرر المخزون المحجوز، وتوثق الفاعل كـ `[system]`.
- **ملف الإعداد (`vercel.json`)**:
  - جدولة آلية للعمل كل 15 دقيقة (`*/15 * * * *`).

### و. واجهات المستخدم ولوحة تحكم الطلبات (Admin & Customer Portals):
1. **بوابة العميل (`/account/orders` و `/account/orders/[id]`)**:
   - استعراض تاريخ طلبات العميل مع الترقيم وحالة الدفع والطلب.
   - صفحة تفاصيل الطلب (`MyOrderDetail.tsx`): عرض البنود، الأسعار، العناوين، تتبع زمني ديناميكي (`OrderTimeline`) يخفي الملاحظات الإدارية الداخلية، وزر إلغاء الطلب المتاح في الحالات المبكرة.
2. **لوحة الإدارة (`/admin/orders` و `/admin/orders/[id]`)**:
   - جدول إدارة الطلبات (`OrdersTable.tsx`): بحث نصي Debounced برقم الطلب أو البريد أو الاسم، فلترة بحالة الطلب، ترقيم، وإشعارات تحديث.
   - تفاصيل الطلب وتحديث الحالات (`OrderDetail.tsx`):
     - فحص الحالات التالية المتاحة للمدير تلقائياً وتوليد أزرار الانتقال الصالحة فقط.
     - مربع تأكيد العمليات الحرجة (الإلغاء والاسترداد) مع تحذير واضح بعدم قابلية التراجع.
     - حقل ملاحظة إدارية يُسجل في `OrderStatusLog`.
     - خيار تبديل `restock` لإعادة المنتج إلى المخزون عند تحديد حالة `RETURNED`.
3. **مكونات الواجهة المشتركة**:
   - `OrderStatusBadge` و `PaymentStatusBadge`: شارات حالة ملونة تدعم اللغتين العربية والإنجليزية.
   - `OrderTimeline`: شريط زمني عمودي تفاعلي يعرض دورة حياة الطلب التاريخية.
   - `src/lib/order-format.ts`: تنسيق المبالغ المالية بدعم تلقائي ومحلي لعملات الخليج والعملات العالمية عبر `Intl.NumberFormat`.

### ز. حزمة اختبارات دورة حياة الطلبات (`src/modules/orders/__tests__/order-status.test.ts`):
- تغطية شاملة تشمل:
  1. التحقق من سلامة كافة أهداف الانتقال في مصفوفة الحالات.
  2. اختبار الحالات النهائية وتأكيد استحالة الخروج منها.
  3. اختبار رفض القفز بين المراحل غير المسموحة (مثل PENDING مباشرة إلى SHIPPED).
  4. اختبار قيود الإدارة (منع تعيين PENDING أو CONFIRMED يدوياً).
  5. اختبار توليد خطة الانتقال (`planTransition`): فحص حالات تحرير المخزون غير المدفوع، إعادة المخزون للطلب المدفوع وتفعيل الاسترداد، وحظر الإلغاء أثناء وجود دفعة قيد المعالجة.

---

---

## ⭐ 10. تفاصيل المراجعات والمفضلة وإشعارات البريد ولوحة التقارير وإصلاحات المشروع (Week 7 Details & System Hardening)

تم إنجاز منظومة المراجعات، قائمة الرغبات، إشعارات البريد الإلكتروني عبر Resend، ولوحة التقارير والإحصائيات الإدارية، بالتزامن مع حزمة إصلاحات معمارية شاملة لضمان أقصى درجات الاستقرار:

### أ. نظام تقييمات ومراجعات المنتجات والاعتدال الإداري (`src/modules/reviews/`):
- **التحقق الصارم من الشراء الفعلي والتسليم (`hasDeliveredPurchase`)**:
  - فحص وجود سجل في جدول `OrderItem` يرتبط بطلب للمستخدم نفسه وتكون حالته `DELIVERED`.
  - لا يُسمح بكتابة أي تقييم ما لم يستلم العميل المنتج فعلياً (`PURCHASE_REQUIRED - 403`).
- **منع تكرار التقييمات وقفل التزامن**:
  - قيد فريد على مستوى قاعدة البيانات: `@@unique([productId, userId])`.
  - اصطياد خطأ Prisma `P2002` في حال حدوث محاولات إرسال متزامنة وتحويله إلى `409 REVIEW_ALREADY_EXISTS`.
- **حساب الإحصائيات وتوزيع النجوم (`buildSummary` & `ratingDistribution`)**:
  - حساب متوسط التقييم العام مقرباً لأقرب خانة عشرية.
  - حساب توزيع النجوم من 1 إلى 5 نجوم عبر Prisma `groupBy` لعرض أشرطة التقدم للمشترين.
- **حماية خصوصية العملاء (`maskName`)**:
  - إخفاء الاسم الكامل للعميل وعرض الاسم الأول مع الحرف الأول من اسم العائلة فقط (مثال: "سالم خ.") في المراجعات العامة.
- **سياق المشاهد المخصص للمنتج (`viewer`)**:
  - إرجاع كائن `viewer` يحتوي على:
    - `canReview`: هل يحق له التقييم الآن (استلم المنتج ولم يسبق له التقييم).
    - `hasReviewed`: هل قيّم المنتج سابقاً.
    - `myReview`: التقييم الخاص به وحالته الحالية (`PENDING`, `APPROVED`, `REJECTED`).
- **لوحة إدارة واعتدال المراجعات (`/admin/reviews`)**:
  - جدول إداري متكامل `ReviewsTable.tsx` يدعم الفلترة بحالة المراجعة، الترقيم، وقبول المراجعة (`APPROVED`)، أو رفضها (`REJECTED`)، أو حذفها نهائياً.
- **واجهات المستخدم**:
  - مكون `ProductReviews.tsx`: عرض قائمة المراجعات المعتمدة، توزيع النجوم، ونموذج إرسال التقييم.
  - مكون `StarRating.tsx`: مكون تفاعلي لاختيار النجوم وتلوينها مع دعم حالات القراءة فقط أو التحرير.

### ب. نظام قائمة الرغبات الذكية (Wishlist System - `src/modules/wishlist/`):
- **إضافة وحذف المنتجات بآلية Idempotent ضد التكرار**:
  - الإضافة عبر Prisma `upsert`، والحذف عبر `deleteMany`.
  - التحقق من نشاط المنتج (`status === "ACTIVE"`) قبل إضافته لمنع إضافة منتجات مسودة أو مؤرشفة.
- **نقطة نهاية سريعة وخفيفة للمعرفات فقط (`idsOnly=true`)**:
  - المسار `GET /api/wishlist?idsOnly=true` يسترجع مصفوفة المعرفات `string[]` فقط عبر استعلام مباشر وسريع.
  - يُمكّن بطاقات المنتجات في صفحات الكتالوج والبحث من تلوين أيقونة القلب فورياً دون الحاجة لجلب كائنات المنتجات بالكامل.
- **حساب المخزون الفعلي المتاح لحظياً**:
  - استرجاع عناصر المفضلة مع احتساب الرصيد المتاح للبيع: `available = max(0, stock - reservedStock)` وتنبيه العميل في حال نفاد الكمية.
- **واجهات المستخدم**:
  - زر المفضلة التفاعلي `WishlistButton.tsx` المدمج مع كل بطاقة منتج وصفحة التفاصيل.
  - صفحة العميل المخصصة `/account/wishlist` ومكون `MyWishlist.tsx` لإدارة المنتجات المفضلة ونقلها مباشرة إلى السلة.

### ج. خدمة إشعارات البريد وتأكيد الطلبات غير المعطلة (Resend Email Service - `src/modules/notifications/`):
- **عميل Resend الموحد (`src/lib/email.ts`)**:
  - تهيئة عميل Resend مع فحص آمن لمتغير `RESEND_API_KEY`.
  - تخطي الإرسال بسلاسة في حال عدم توفر المفتاح مع تسجيل تحذير دون رمي استثناءات تعطل مسار العمل.
- **الحجز الذري ومنع التكرار (`claimConfirmationEmail`)**:
  - استعلام شرطي ذري:
    `prisma.order.updateMany({ where: { id: orderId, confirmationEmailSentAt: null }, data: { confirmationEmailSentAt: new Date() } })`
  - يضمن نجاح الحجز مرة واحدة فقط ويمنع تماماً إرسال بريد التأكيد أكثر من مرة لنفس الطلب (Idempotency).
- **آلية التراجع عند الفشل (`revertConfirmationEmailClaim`)**:
  - في حال تعثر إرسال البريد عبر الشبكة، يتم تصفير حقل `confirmationEmailSentAt` تلقائياً ليتاح للنظام إعادة المحاولة لاحقاً.
- **قوالب البريد ثنائية اللغة المتوافقة مع كافة العملاء (`email-templates.ts`)**:
  - توليد نسختين متكاملتين: نسخة HTML بتنسيق احترافي متجاوب، ونسخة نصية صريحة (Plain Text).
  - تشمل بيانات الطلب: رقم الطلب المختصر، اسم العميل، جدول البنود والكميات والأسعار، تفاصيل الخصم والشحن والضريبة والمجموع النهائي بالعملة المعتمدة، ورابط مباشر لتتبع الطلب للعملاء المسجلين.
- **التكامل غير المعطل عبر Next.js `after()`**:
  - داخل معالج الـ Webhook للبوابة الخليجية (`/api/webhooks/local-gateway`):
    `after(() => sendOrderConfirmationEmail(orderId));`
  - يُنفذ الإرسال في الخلفية بعد إنهاء وإرجاع استجابة الـ HTTP بنجاح لبوابة الدفع، لمنع تأخير الرد أو التسبب في إعادة إرسال الأحداث.
- **حزمة اختبارات وحدة آلية (`src/modules/notifications/__tests__/notification.service.test.ts`)**:
  - اختبار نجاح الإرسال لمرة واحدة.
  - اختبار رفض الإرسال المكرر (`ALREADY_SENT`).
  - اختبار إلغاء الحجز الذري عند فشل مزود البريد.
  - اختبار رفض إرسال بريد لطلب غير مدفوع (`NOT_PAID`).

### د. لوحة تقارير وتحليلات المبيعات والإدارة المتقدمة (`src/modules/reports/`):
- **تجميع الإيرادات والمبيعات بتعدد العملات (`revenueByCurrency` & `salesByCountry`)**:
  - استعلامات تجميعية عبر Prisma `groupBy` تستثني الطلبات الملغاة والمرتجعة والفاشلة.
  - تصنيف الإيرادات بدقة حسب العملة (SAR, AED, OMR, KWD, BHD, QAR, USD) وتوزيع المبيعات حسب الدول.
- **أفضل 5 منتجات مبيعاً (`topProducts`)**:
  - تجميع بنود الطلبات المدفوعة وحساب مجموع الكميات المباعة لكل منتج وربطه ببيانات المنتج وصوره.
- **السلسلة الزمنية اليومية للطلبات (`dailyPaidOrders` & `fillDailySeries`)**:
  - استعلام SQL مخصص يحسب عدد الطلبات المدفوعة لكل يوم خلال الفترة المحددة (مثلاً 30 يوماً).
  - ملء الأيام التي لا تحتوي مبيعات بصفر تلقائياً لضمان رسم بياني متصل وسلس في الواجهة.
- **مؤشرات الأداء الرئيسية (KPIs)**:
  - احتساب إجمالي الطلبات المدفوعة، إجمالي كل الطلبات، عدد العملاء الجدد المسجلين، وعدد المراجعات التي بانتظار الاعتماد.
- **محرك تنبيهات المخزون المنخفض (`lowStock` / `getLowStock`)**:
  - استعلام SQL ذري يحسب الرصيد المتاح للبيع `(stock - reservedStock)` للمنتجات النشطة.
  - فرز المنتجات تصاعدياً بحسب الأقرب للنفاد مقارنة بحد التنبيه (`threshold`).
- **واجهة الإدارة (`DashboardStats.tsx` و `/admin/page.tsx`)**:
  - بطاقات إحصائية تفاعلية، جداول إيرادات العملات ومبيعات الدول، قائمة المنتجات الأكثر مبيعاً، وتنبيهات المخزون الحرج.

### هـ. حزمة الإصلاحات الشاملة ومعايير استقرار المشروع (System-wide Fixes & Hardening):
- **ترقية مشغل Prisma 7 والـ Driver Adapter**:
  - اعتماد `@prisma/adapter-pg` مع `PrismaPg` في `src/lib/prisma.ts` وتفعيل إعدادات SSL المتوافقة مع Neon (`rejectUnauthorized: false`).
  - إنشاء ملف التكوين الرسمي `prisma.config.ts` لضبط مسارات المخطط والهجرات والبذر وفق معيار Prisma 7 الحديث.
- **توحيد التعامل مع Next.js 15/16 Async Params**:
  - تحديث كافة مسارات الـ Route Handlers التي تحتوي بارامترات ديناميكية لانتظار كائن `context.params` بأسلوب `await` (مثل `const { id } = await context.params` و `const { slug } = await context.params`) لإنهاء أي تحذيرات أو أخطاء تشغيلية.
- **مركزية وتوحيد معالجة الأخطاء (`handleApiError` و `fail(error)`)**:
  - توحيد دالة `fail(error)` في `src/lib/api-response.ts` لتقوم بتفويض المعالجة لـ `handleApiError` في `src/lib/api-error.ts`.
  - معالجة ذكية لأخطاء Zod، أخطاء Prisma العلائقية (`P2002`, `P2025`)، وأخطاء الـ `ApiError`، مع حجب التفاصيل الداخلية للأخطاء غير المتوقعة خلف رمز `500 INTERNAL_ERROR`.
- **تحسين مزودي الواجهة (AppProviders & TanStack Query)**:
  - ضبط حاوية `QueryClient` الافتراضية مع مدة `staleTime: 60s`، وتعطيل إعادة المحاولة التلقائية (Retry) لأخطاء العميل (4xx) لتجنب استنزاف الخادم.

---

## 🛡️ 11. تفاصيل الأمان المتقدم، محرك الـ SEO، اختبارات E2E، وتحسين الأداء وخط التكامل المستمر (Week 8 Details)

تم إنجاز الأسبوع الثامن بالكامل لتتويج المتجر بأعلى معايير الحماية المؤسسية، محرك SEO ثنائي اللغة متكامل، تغطية اختبارات شاملة مع Playwright، فهارس قاعدة بيانات مركبة عالية السرعة، وسير عمل آلي في GitHub Actions:

### أ. التدقيق الأمني الآلي الصارم (`src/__tests__/security/api-audit.test.ts`):
جناح اختبارات استباقي ومؤتمت يعمل مع Vitest يفحص كود المشروع ومسارات الـ API بالكامل للتأكد من انضباط المعايير المعمارية والأمنية:
1. **عزل طبقة البيانات (No Direct Prisma in Routes)**: التحقق من عدم قيام أي Route Handler باستيراد `@/lib/prisma` أو `@prisma/client` أو استدعاء `prisma` مباشرة، لفرض تدفق `Route -> Service -> Repository` إجبارياً.
2. **حراسة مسارات الإدارة (`requireAdmin`)**: فحص كافة مسارات `/api/admin/*` والتأكد من احتوائها على استدعاء صريح لدالة `requireAdmin()`.
3. **حراسة مسارات العميل والخصوصية (`requireUser`)**: فحص مسارات الطلبات والمراجعات والمفضلة والعناوين والتأكد من التحقق الإلزامي من جلسة المستخدم وهويته.
4. **التحقق الإلزامي من المدخلات عبر Zod**: فحص كافة مسارات التعديل والكتابة (`POST`, `PUT`, `PATCH`) والتأكد من تطبيق `safeParse` أو `parse` عبر مخططات Zod (مع استثناء الـ Webhooks والـ Cron المعزولة أمنياً).
5. **معالجة الأخطاء الموحدة**: التأكد من عدم استخدام استجابات أخطاء عشوائية والتزام كافة المسارات بدوال `fail()` أو `handleApiError()`.
6. **انتظار البارامترات غير التزامنية (`Async Params`)**: التأكد من انتظار كائن `context.params` بأسلوب `await` في كافة المسارات الديناميكية المتوافقة مع Next.js 15/16.
7. **منع هجمات الحقن والـ XSS**: التأكد من خلو المشروع تماماً من أي استعلامات SQL غير آمنة (`$queryRawUnsafe` / `$executeRawUnsafe`)، وحصر استخدام `dangerouslySetInnerHTML` حصرياً على وسوم البيانات المهيكلة داخل `JsonLd.tsx`.
8. **منع تسريب الأسرار**: التحقق من عدم وجود أي مفاتيح خاصة أو كلمات مرور أو توكنات سرية مُعرّضة عبر بادئة `NEXT_PUBLIC_*`.

### ب. ترويسات الأمان المتقدمة وسياسة أمان المحتوى (`next.config.ts` & CSP):
- **سياسة أمان المحتوى (Content Security Policy - CSP)**:
  - ضبط شامل للمصادر الموثوقة: نصوص برمجية من النطاق نفسه و Stripe (`https://js.stripe.com`) و Vercel Scripts، خطوط من Google Fonts، صور من التخزين السحابي (`blob:`, `data:`, HTTPS)، واتصالات آمنة لـ Stripe API و Vercel Insights.
  - حظر الإطارات الخارجية (`frame-ancestors 'none'`) وحظر كائنات الوسائط غير الآمنة (`object-src 'none'`).
  - وضع التقرير المبدئي: افتراضياً تُرسل الترويسة كـ `Content-Security-Policy-Report-Only` لمراقبة سجلات الكونسول دون إعاقة واجهات المستخدم، مع إمكانية التبديل للإنفاذ الصارم الفوري عبر المتغير البيئي `CSP_ENFORCE="true"`.
- **الترويسات الأمنية المؤسسية**:
  - `Strict-Transport-Security` (HSTS): فرض الاتصال المشفر لمدة عامين مع تضمين النطاقات الفرعية والقائمة المسبقة (`preload`).
  - `X-Frame-Options: DENY`: منع تضمين صفحات المتجر في iframe لحمايته تماماً من هجمات Clickjacking.
  - `X-Content-Type-Options: nosniff`: منع المتصفح من استنتاج نوع المحتوى خلافاً لترويسة MIME لتفادي هجمات رفع الملفات الخبيثة.
  - `Referrer-Policy: strict-origin-when-cross-origin`: حماية خصوصية العميل عند الانتقال لروابط خارجية.
  - `Permissions-Policy`: حجب الوصول للكاميرا والميكروفون والموقع الجغرافي وقصر إذن الدفع على المتجر و Stripe.
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`: عزل سياق التصفح مع السماح بنوافذ الدفع المنبثقة.
  - `poweredByHeader: false`: إخفاء ترويسة `X-Powered-By: Next.js` لمنع كشف بيئة التشغيل.

### ج. طبقات تحديد المعدل المتقدمة (Edge & Route Limiters via Upstash):
توسيع نظام الـ Rate Limiting في `src/lib/rate-limit.ts` ودمجه بالـ Edge Middleware (`src/middleware.ts`):
1. **مستويات التحديد المتخصصة**:
   - `edgeAuthRateLimit`: 10 محاولات في الدقيقة لمسارات التسجيل والمصادقة واستعادة كلمة المرور لمنع هجمات القوة الغاشمة (Brute-force).
   - `edgeAuthHourlyRateLimit`: 40 محاولة في الساعة لكل IP كطبقة حماية ثانية طويلة المدى ضد التخمين الموزع.
   - `sensitiveWriteRateLimit`: 30 طلباً في الدقيقة لعمليات الكتابة الحساسة (الكوبونات، المراجعات، المفضلة، العناوين، الطلبات) لمنع إغراق الخادم بالبيانات.
   - `apiRateLimit`: 120 طلباً في الدقيقة للمسارات العامة.
   - `adminRateLimit`: 300 طلب في الدقيقة لمسارات الإدارة.
   - `checkoutRateLimit`: 5 طلبات في الدقيقة لجلسات إتمام الشراء لمنع استنزاف المخزون والطلبات الوهمية.
2. **استثناء المسارات الموثوقة**: استثناء إشعارات الـ Webhooks الموقعة رقمياً لـ Stripe و Tap و Moyasar، ومهمة الـ Cron المجدولة المحمية بـ `CRON_SECRET`.
3. **آلية المرونة واستمرارية المتجر (Fail-Open Architecture)**: في حال انقطاع الاتصال بخادم Upstash Redis، يلتقط النظام الاستثناء ويعيد `PASS` لتفادي تعطيل عمليات البيع الحقيقية مع تسجيل تحذير في سجلات الخادم.
4. **ترويسات المعايير العالمية**: إرجاع ترويسات `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` مع ترويسة `Retry-After` عند تجاوز الحد الأقصى (رمز `429 Too Many Requests`).

### د. محرك الـ SEO والبيانات المهيكلة المتقدمة (`src/modules/seo/`):
- **بنية الموديول الخادمية المعزولة**:
  - `seo.repository.ts`: استعلامات Prisma خفيفة ومحددة الحقول تجلب فقط بيانات العنوان والوصف والـ SKU والصور والتقييمات المعتمدة، واستعلامات توليد روابط الـ Sitemap.
  - `seo.service.ts`: بناء الـ Metadata ووسوم OpenGraph و Twitter Cards ثنائية اللغة، مع دمج الـ Cache عبر `unstable_cache` بمهلة إعادة تحقق 5 دقائق (`revalidate: 300`) لمنع تكرار استعلامات قاعدة البيانات بين الـ Layout والصفحة.
- **التوليد الديناميكي لبيانات الصفحات (`layout.tsx`)**:
  - `src/app/(shop)/products/[slug]/layout.tsx`: توليد ديناميكي لعنوان المنتج والوصف العربي/الإنجليزي والرابط الأصلي (Canonical URL)، وحقن وسوم Schema.org.
  - `src/app/(shop)/category/[slug]/layout.tsx`: توليد ديناميكي لبيانات الفئات وتدرج روابط شجرة التصنيف.
- **البيانات المهيكلة الغنية (JSON-LD via Schema.org)**:
  - مخطط `Product`: يشمل اسم المنتج، الوصف، الـ SKU، مصفوفة الصور، العلامة التجارية، الفئة، وعرض السعر بالدولار `Offer` مع العملة وحالة التوفر اللحظية (`InStock` أو `OutOfStock` بناءً على المخزون الحي `stock - reservedStock`)، ومخطط التقييم الإجمالي `AggregateRating` (المتوسط وعدد المراجعات المعتمدة).
  - مخطط `BreadcrumbList`: شجرة تنقل هرمية تُرشد محركات البحث لتسلسل الصفحات (الرئيسية ← المنتجات ← الفئة ← المنتج).
- **خريطة الموقع الذكية (`src/app/sitemap.ts`)**:
  - توليد تلقائي للروابط بمهلة كاش ساعة واحدة (`revalidate = 3600`).
  - تشمل الصفحات الثابتة (`/`, `/products`, `/about`, `/faqs`, `/pricing`)، صفحات الفئات الديناميكية مع أولوية 0.7 وتحديث أسبوعي، وصفحات المنتجات النشطة مع أولوية 0.8، مع حماية ضد توقف الخادم عند تعذر قاعدة البيانات (`fallback to static`).
- **قواعد محركات البحث (`src/app/robots.ts`)**:
  - السماح لكافة محركات البحث بالزحف إلى صفحات المتجر العامة والمنتجات.
  - حجب صارم لمسارات الإدارة (`/admin`), واجهات البرمجة (`/api/`), حساب العميل (`/account`), والدفع والسلة والمصادقة.
  - حظر زحف روابط الفلاتر والاستعلامات المكررة (`/*?*q=`, `/*?*sort=`, `/*?*minPrice=`, `/*?*maxPrice=`, `/*?*inStock=`) لمنع عقوبات المحتوى المكرر (Duplicate Content) في محرك بحث Google.
  - الإشارة الصريحة للرابط المطلق لخريطة الموقع `sitemap.xml`.

### هـ. فهارس قاعدة البيانات المركبة وتحسين الأداء (Composite Indexes):
تمت إضافة وتطبيق هجرة رسمية عبر Prisma لقاعدة بيانات PostgreSQL تضمنت 6 فهارس مركبة عالية الأداء:
1. `Product: @@index([status, categoryId])`: تسريع فلترة المنتجات النشطة ضمن فئة معينة في صفحات الكتالوج.
2. `Product: @@index([status, createdAt])`: تسريع استعلامات ترتيب المنتجات الأحدث مبيعاً وعرضها في الصفحة الرئيسية.
3. `Order: @@index([userId, createdAt])`: استبدال الفهرس المفرد القديم بفهرس مركب يرتب طلبات المستخدم زمنياً دون استهلاك موارد الذاكرة.
4. `Order: @@index([paymentStatus, createdAt])`: تسريع استعلامات تجميع الإيرادات والمبيعات في لوحة التقارير الإدارية.
5. `Order: @@index([status, paymentStatus, createdAt])`: تسريع مهمة Vercel Cron التي تبحث كل 15 دقيقة عن الطلبات المنتهية (`PENDING` و `UNPAID`).
6. `Review: @@index([productId, status])`: تسريع حساب متوسط التقييمات وتوزيع النجوم وجلب المراجعات المعتمدة (`APPROVED`) لصفحة تفاصيل المنتج.

### و. حزمة اختبارات E2E الشاملة عبر Playwright (`e2e/`):
تم إعداد وتجهيز بيئة الاختبارات الشاملة بملف `playwright.config.ts`، مع ثلاثة ملفات اختبار متخصصة:
1. **اختبارات حراس المسارات وصيغ الـ API (`guards-and-api.e2e.ts`)**:
   - التحقق من نجاح وصيغة بيانات `/api/products` و `/api/categories` و `/api/products/facets`.
   - التحقق من رفض الطلبات ذات الأجسام الفارغة برمز 400 وصيغة الخطأ الموحدة.
   - اختبار إرسال JSON تالف والتأكد من رفضه بأمان دون حدوث 500 أو تسريب تفاصيل داخلية.
   - التحقق من حظر الوصول غير المصادق لمسارات الإدارة والعميل وإرجاع 401/403.
   - التحقق من إعادة توجيه المستخدم غير المسجل إلى صفحة الدخول عند زيارة `/admin` أو `/account/orders`.
   - التحقق من حماية الـ Cron ومسارات الـ Webhooks ضد الطلبات غير الموقعة.
2. **اختبارات ترويسات الأمان والـ SEO (`security-and-seo.e2e.ts`)**:
   - فحص وجود ترويسات `x-content-type-options`, `x-frame-options`, `referrer-policy`, `strict-transport-security`, و `content-security-policy`.
   - فحص محتوى `robots.txt` وحجب المسارات الحساسة وربط الـ sitemap.
   - فحص استجابة `sitemap.xml` واحتوائه على بنية XML سليمة وروابط منتجات حية.
   - زيارة صفحة المنتج وفحص وجود الوسوم الوصفية وعنوان الصفحة ورابط الـ Canonical ومخططات JSON-LD (`Product` بالدولار وحالة التوفر، و `BreadcrumbList`).
   - اختبار اختياري لتقييد المعدل والتحقق من إرجاع رمز 429 عند تجاوز الحد المسموح.
3. **اختبار رحلة الشراء الكاملة للزائر (`shopping-journey.e2e.ts`)**:
   - محاكاة متصفح حقيقي يتصفح الكتالوج `/products`، يختار أول منتج، ويضيفه للسلة.
   - التحقق من تخزين السلة في `localStorage` بمفتاح الزائر `alzain-cart-storage:guest`.
   - الانتقال إلى صفحة السلة `/cart` ومتابعة الشراء نحو صفحة الدفع `/checkout`.
   - التأكد التام من قدرة الزائر على إتمام الشراء دون إجباره على تسجيل الدخول المسبق.
   - التحقق من مرونة صفحة السلة الفارغة وعدم حدوث أي انهيار برمجي.

### ز. خط أنابيب التكامل المستمر (GitHub Actions CI Workflow - `.github/workflows/ci.yml`):
سير عمل آلي محكم يعمل على خوادم Ubuntu مع Node 22 وبيئة كاش لـ npm:
- تشغيل `prisma:generate` لبناء العميل بالأنواع المحدثة.
- تشغيل الفحص اللغوي والتنسيقي `npm run lint`.
- تشغيل اختبارات Vitest بالكامل بما فيها التدقيق المعماري والأمني `src/__tests__/security/api-audit.test.ts`.
- فحص ثغرات الاعتماديات في حزم npm عبر `npm run audit:deps` للتحقق من عدم وجود ثغرات بدرجة خطورة عالية أو حرجة.
- بناء نسخة الإنتاج النهائية للمتجر عبر `npm run build` للتأكد التام من خلو كافة الصفحات والمسارات من أخطاء الـ Typescript أو مشاكل الـ Bundling.

---

## 🔐 12. معايير الأمان وسياسات الحماية (Security Standards & Defense in Depth)

1. **حماية مسارات الإدارة (Defense in Depth)**:
   - **الطبقة الأولى**: `src/middleware.ts` يفحص التوكن والدور ويمنع أي مستخدم ليس `ADMIN` أو `SUPER_ADMIN` مع إرجاع 403 لمسارات API.
   - **الطبقة الثانية**: استدعاء دالة `requireAdmin()` في بداية كل مسار تحكم إداري تحت `/api/admin/*`.
2. **حماية مسارات وبوابة العميل (Customer Access Control & Privacy)**:
   - استدعاء `requireUser()` في مسارات طلبات العميل ومراجعاته وقائمة رغباته وعناوينه (`/api/orders/*`, `/api/reviews`, `/api/wishlist`, `/api/addresses`).
   - إرجاع خطأ 404 بدلاً من 403 عند محاولة الوصول لطلب لا يملكه المستخدم لمنع هجمات الاستكشاف والتعداد (ID Enumeration).
3. **أمان المهام المجدولة (Cron Secret Security)**:
   - حماية مسار `/api/cron/expire-orders` بالتحقق من ترويسة التفويض ومقارنة `CRON_SECRET` باستخدام المقارنة الثابتة التوقيت `crypto.timingSafeEqual` لمنع هجمات التوقيت.
4. **أمان الـ Webhooks والتواقيع الرقمية**:
   - التحقق من ترويسة `stripe-signature` لـ Stripe.
   - التحقق من توقيع HMAC-SHA256 على الـ `hashstring` لبوابة Tap.
   - التحقق الثابت التوقيت (Constant-time) عبر `crypto.timingSafeEqual` لـ Tap و Moyasar لمنع هجمات الـ Timing Attacks.
5. **تشفير كلمات المرور (`src/lib/password.ts`)**:
   - استخدام خوارزمية **Argon2id** بذاكرة ~19MB وتكرار زمني آمن، وهي المعيار الأكثر مناعة ضد هجمات الـ GPU مقارنة بـ bcrypt.
6. **تقييد معدل الطلبات متعدد الطبقات (Multi-tier Rate Limiting via Upstash Redis)**:
   - مسارات المصادقة والتسجيل: 10 طلبات في الدقيقة و 40 في الساعة لكل IP.
   - عمليات الكتابة الحساسة: 30 طلباً في الدقيقة.
   - مسارات الـ API العامة: 120 طلباً في الدقيقة.
   - مسارات الإدارة: 300 طلب في الدقيقة.
   - جلسات إتمام الشراء `/api/checkout/session`: 5 طلبات في الدقيقة.
7. **ترويسات الأمان الصارمة وسياسة المحتوى (CSP & Enterprise Headers)**:
   - فرض CSP، HSTS، X-Frame-Options DENY، X-Content-Type-Options nosniff، Permissions-Policy، وحجب ترويسات كشف الإصدار.
8. **حماية ملكية الموارد (Resource Ownership)**:
   - العناوين والطلبات والمراجعات وقائمة الرغبات لا يمكن تعديلها أو حذفها إلا من قبل المستخدم المالك لها.
9. **تدقيق الكود المعماري الآلي المستمر (`api-audit.test.ts`)**:
   - ضمان عدم وجود أي تسريب لقاعدة البيانات خارج الـ Repository، وخلو المشروع من أي استعلامات SQL غير آمنة أو استخدام غير منضبط لـ `dangerouslySetInnerHTML`.

---

## ⚙️ 13. متغيرات البيئة المطلوبة (Environment Variables)

ملف `.env` المعتمد:

```env
# قاعدة البيانات (PostgreSQL - Neon / Supabase)
DATABASE_URL="postgresql://username:password@ep-xyz.neon.tech/alzaintea?sslmode=require"

# رابط الموقع الأساسي للـ SEO والروابط المطلقة
NEXT_PUBLIC_SITE_URL="https://alzaintea.com"

# مصادقة NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# تقييد المعدل عبر Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-upstash-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# تفعيل فرض سياسة أمان المحتوى الصارمة (افتراضياً Report-Only إذا لم تُضبط)
CSP_ENFORCE="false"

# إعدادات Stripe (الدفع الدولي بالدولار)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# إعدادات بوابة الدفع الخليجية (Feature Flag: "tap" أو "moyasar")
PAYMENT_PROVIDER="tap"
LOCAL_GATEWAY_API_KEY="sk_test_..."
LOCAL_GATEWAY_WEBHOOK_SECRET="whsec_..."

# سر المهام المجدولة (Vercel Cron)
CRON_SECRET="your-secure-cron-secret"

# البريد الإلكتروني والمعاملات (Resend - مفعّل ومكتمل)
RESEND_API_KEY="re_..."
EMAIL_FROM="Alzain Tea <onboarding@resend.dev>"

# إشعارات WhatsApp (البنية التحتية جاهزة - V2)
WHATSAPP_API_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"

# تفعيل اختبارات تحديد المعدل في بيئة E2E (اختياري)
E2E_RATE_LIMIT="0"
```

---

## ⚡ 14. أوامر التشغيل وإدارة المشروع (CLI Commands)

```bash
# تثبيت الحزم
npm install

# تشغيل خادم التطوير
npm run dev

# بناء المشروع وفحص الأخطاء البرمجية
npm run build
npm run lint

# تشغيل اختبارات الوحدة والتدقيق الأمني (Vitest)
npm run test
npm run test:audit                                             # التدقيق الأمني المعماري الآلي فقط
npx vitest run src/modules/payments/__tests__/payment-cycle.test.ts
npx vitest run src/modules/orders/__tests__/order-status.test.ts
npx vitest run src/modules/notifications/__tests__/notification.service.test.ts

# تشغيل اختبارات E2E الشاملة (Playwright)
npm run test:e2e                                               # تشغيل كافة اختبارات E2E بدون واجهة
npm run test:e2e:ui                                            # تشغيل اختبارات E2E مع واجهة Playwright التفاعلية
npm run e2e:install                                            # تثبيت متصفح Chromium المخصص للاختبارات

# فحص الثغرات الأمنية في الحزم والاعتماديات
npm run audit:deps

# أوامر Prisma ORM (مع Prisma 7 Driver Adapter و prisma.config.ts)
npm run prisma:generate   # توليد Prisma Client
npm run prisma:push       # مزامنة سريعة لبيئة التطوير
npm run prisma:migrate    # إنشاء وتطبيق Migrations رسمية
npm run prisma:seed       # تشغيل بذر البيانات التجريبية (tsx prisma/seed.ts)
npm run prisma:studio     # استعراض قاعدة البيانات في واجهة رسومية
```

---

## 📅 15. حالة التقدم وخارطة الطريق التنفيذية (9-Week Roadmap)

### ✅ المراحل المنجزة بالكامل (Completed):
- [x] **الأسبوع 1: إعداد المخطط الشامل + المصادقة والأدوار**
  - [x] بناء مخطط Prisma الشامل (11 جدولاً، 6 Enums، ودعم المتغيرات والشجرة الهرمية للفئات).
  - [x] تطبيق الهجرات الأولية وتشغيل `prisma/seed.ts` بالبيانات التجريبية.
  - [x] إعداد NextAuth مع تشفير Argon2id المتقدم.
  - [x] إنشاء واجهة التسجيل `POST /api/auth/register` مع فحص البريد الفريد.
  - [x] تفعيل حماية الأدوار عبر `middleware.ts` و `requireAdmin()`.
- [x] **الأسبوع 2: خدمات المنتجات والفئات + لوحة تحكم الإدارة (Admin CRUD)**
  - [x] تطبيق معمارية الطبقات لموديول المنتجات والفئات (Service + Repository + Zod Validators).
  - [x] بناء واجهات الـ Admin CRUD للمنتجات والفئات (`/api/admin/products`, `/api/admin/categories`).
  - [x] بناء شاشات لوحة الإدارة (`ProductsTable`, `ProductForm`, `CategoriesTable`, `CategoryForm`).
  - [x] بناء واجهات القراءة العامة للمتجر والـ API endpoints.
- [x] **الأسبوع 3: نظام السلة المتقدم + البحث والفلترة والترقيم**
  - [x] بناء مخزن Zustand لسلة المشتريات بمفاتيح متعددة (`guest` و `userId`).
  - [x] بناء آلية دمج سلة الزائر التلقائية عند تسجيل الدخول (`cart-merge.ts` + `useCartAuthSync.ts`).
  - [x] بناء واجهة التحقق الخادمي من توفر مخزون السلة وتطابق الأسعار (`POST /api/cart/validate`).
  - [x] بناء نظام البحث النصي، الفلترة الديناميكية، الـ Facets، والترقيم المتجاوب في صفحة المنتجات.
- [x] **الأسبوع 4: مرحلة إتمام الشراء (Checkout) + العناوين والكوبونات وبدء Stripe**
  - [x] بناء موديول العناوين بالكامل (`addresses`: service, repository, validators, API CRUD).
  - [x] بناء خدمة حساب رسوم الشحن `GET /api/shipping/calculate`.
  - [x] بناء محرك فحص وتطبيق الكوبونات `POST /api/coupons/validate` مع شروط الاستخدام والحدود.
  - [x] بناء خدمة إنشاء جلسة الشراء `POST /api/checkout/session` مع إعادة احتساب الأسعار والضرائب.
  - [x] تطبيق حجز المخزون الذري داخل معاملة Prisma (`reservedStock`) لمنع Overselling.
  - [x] ربط بوابة Stripe Checkout (`payment.service.ts` و `stripe.provider.ts`).
  - [x] بناء معالج Webhook الموثوق (`/api/webhooks/stripe`) وتأكيد الدفع وخصم المخزون الفعلي.
  - [x] تطبيق Rate Limiting على جلسات الشراء عبر Upstash Redis.
- [x] **الأسبوع 5: إتمام بوابات الدفع الخليجية (Tap/Moyasar) + الـ Webhooks المزدوجة وتحرير المخزون**
  - [x] بناء مزود Tap Payments (`tap.provider.ts`) مع التحقق المشفر من التوقيع (HMAC-SHA256 hashstring) ودعم وسائل الدفع الخليجية و Apple Pay.
  - [x] بناء مزود Moyasar (`moyasar.provider.ts`) مع التحقق الآمن عبر `secret_token` بمقارنة ثابتة التوقيت (Constant-Time).
  - [x] إنشاء طبقة البوابة المحلية المشتركة (`local.provider.ts`) مع مفتاح تبديل بيئي (Feature Flag via `PAYMENT_PROVIDER`).
  - [x] تفعيل التوجيه التلقائي للبوابات حسب دولة العميل في `payment.service.ts` (دول الخليج الست $\to$ البوابة المحلية، وبقية العالم $\to$ Stripe).
  - [x] بناء معالج الـ Webhook الموحد للبوابة الخليجية (`/api/webhooks/local-gateway`) مع دعم كامل للـ Idempotency.
  - [x] تطبيق منطق تحرير المخزون المحجوز الذري (`releaseReservedStock`) في `checkout.repository.ts` عند فشل الدفع أو انتهاء الجلسة.
  - [x] دعم العملات الخليجية وتحويلات العملة والتعامل الخاص مع العملات ثلاثية الخانات العشرية (`KWD`, `BHD`, `OMR`) في `gcc-currency.ts`.
  - [x] كتابة حزمة اختبارات شاملة بالـ Mocking لدورة الدفع والـ Webhooks وIdempotency في `payment-cycle.test.ts`.
- [x] **الأسبوع 6: دورة حياة الطلبات (Orders Lifecycle) + إدارة الطلبات في لوحة المدير وإدارة المخزون**
  - [x] بناء آلة حالات الطلبات الصارمة ومصفوفة الانتقالات المقيدة في `order-status.ts`.
  - [x] تطبيق تأثيرات المخزون الذرية (`StockEffect`: `NONE`, `RELEASE_RESERVED`, `RESTOCK`) مع تفادي الـ Deadlocks.
  - [x] بناء التزامن التفاؤلي (Compare-and-Set) لمنع حالات التسابق (Race Conditions) وتكرار العمليات.
  - [x] تفعيل سجل التدقيق الزمني الشامل (`OrderStatusLog`) مع توثيق هوية الفاعل (`admin`, `customer`, `system`).
  - [x] تطبيق قفل الاسترداد المالي الذري (`claimRefund`) ومهايئ بوابات الدفع (`order-refund.adapter.ts`).
  - [x] إتاحة إلغاء الطلب للعميل في المراحل المبكرة (`PENDING`, `CONFIRMED`) عبر `POST /api/orders/[id]/cancel`.
  - [x] جدولة مهمة آلية عبر Vercel Cron (`/api/cron/expire-orders`) محروسة بـ `CRON_SECRET` لإنهاء الطلبات المنتهية وتحرير المخزون.
  - [x] بناء واجهات لوحة الإدارة للطلبات (`OrdersTable.tsx`, `OrderDetail.tsx`) مع التحديث اللحظي وخيار إعادة المخزون (`restock`).
  - [x] بناء بوابة طلبات العميل وتتبعها (`MyOrdersList.tsx`, `MyOrderDetail.tsx`, `OrderTimeline.tsx`, `OrderStatusBadge.tsx`).
  - [x] كتابة حزمة اختبارات وحدة كاملة لآلة الحالات وانتقالات المخزون والاسترداد في `order-status.test.ts`.
- [x] **الأسبوع 7: المراجعات + المفضلة + إشعارات البريد ولوحة التقارير + إصلاحات المشروع (Week 7 + Fixed All)**
  - [x] نظام تقييمات المنتجات الموثقة (`Review`) مع التحقق الإلزامي من الشراء والتسليم (`hasDeliveredPurchase`).
  - [x] إدارة واعتدال المراجعات الإدارية (`/admin/reviews` و `ReviewsTable.tsx`) وتوزيع النجوم وإخفاء الأسماء للخصوصية.
  - [x] نظام قائمة الرغبات (`Wishlist`) مع استرجاع سريع للمعرفات (`idsOnly`) وحساب المخزون الفعلي وزر المفضلة `WishlistButton.tsx`.
  - [x] خدمة إشعارات البريد وتأكيد الطلبات عبر Resend مع حجز ذري يمنع التكرار (`claimConfirmationEmail`) وقوالب HTML/Text غنية وتكامل غير معطل عبر `after()`.
  - [x] كتابة حزمة اختبارات وحدة لخدمة إشعارات البريد في `src/modules/notifications/__tests__/notification.service.test.ts`.
  - [x] لوحة تقارير وإحصائيات المبيعات الإدارية الشاملة (`/admin/page.tsx` و `DashboardStats.tsx`) مع تفصيل الإيرادات بالعملات ومبيعات الدول والمنتجات الأكثر مبيعاً والسلاسل اليومية وتنبيهات المخزون المنخفض.
  - [x] إصلاحات معمارية شاملة: ترقية مشغل Prisma إلى Driver Adapter (`@prisma/adapter-pg` / `PrismaPg`) مع `prisma.config.ts`.
  - [x] توافق كامل مع Next.js 15/16 لمسارات الـ API ذات البارامترات غير التزامنية (`await context.params`).
  - [x] توحيد معالجة الأخطاء عبر `handleApiError` و `fail(error)` لتنسيق أخطاء Zod و Prisma Client و ApiError بأمان.
- [x] **الأسبوع 8: الفحص الأمني الشامل + اختبارات E2E + تحسين SEO والأداء (منجز بالكامل)**
  - [x] تدقيق معماري أمني آلي للمشروع ومسارات الـ API بالكامل (`src/__tests__/security/api-audit.test.ts`).
  - [x] ترويسات أمان مؤسسية مشددة وسياسة أمان محتوى متطورة (`next.config.ts`: CSP Report-Only/Enforce, HSTS, X-Frame-Options DENY, Permissions-Policy).
  - [x] تحديد معدل متقدم متعدد الطبقات (Edge Middleware + Route Handlers) مع Sliding Window و Fail-Open لحماية استمرارية المتجر.
  - [x] محرك SEO متكامل (`src/modules/seo/`) مع كاش خفيف، وتوليد ديناميكي للـ Metadata والـ Canonical URLs باللغتين العربية والإنجليزية.
  - [x] خريطة موقع ديناميكية `sitemap.ts` مع إعادة التحقق كل ساعة، وملف `robots.ts` يحظر المسارات الحساسة وفلاتر التكرار.
  - [x] حقن بيانات مهيكلة غنية Schema.org (`Product` متضمنة الأسعار والمخزون الحي والتقييمات، و `BreadcrumbList`).
  - [x] 6 فهارس قاعدة بيانات علائقية مركبة في Prisma (`[status, categoryId]`, `[status, createdAt]`, `[userId, createdAt]`, `[paymentStatus, createdAt]`, `[status, paymentStatus, createdAt]`, `[productId, status]`).
  - [x] حزمة اختبارات E2E شاملة مع Playwright تغطي رحلة الشراء للزائر، حراس المسارات، ترويسات الأمان، ومحركات البحث.
  - [x] خط أنابيب التكامل المستمر (GitHub Actions CI Workflow) لفحص الجودة والاختبارات وبناء الإنتاج آلياً.

---

### ⏳ المراحل القادمة (Upcoming Weeks):
- [ ] **الأسبوع 9: بيئة الاختبار (Staging) + اختبارات القبول (UAT) + الإطلاق الرسمي**
  - [ ] تجربة النظام بالكامل على بيئة Staging حقيقية.
  - [ ] مراجعة سرعة التحميل وتجربة المستخدم على مختلف الشاشات.
  - [ ] النشر النهائي للإنتاج (Vercel + Neon Production DB) وإطلاق المتجر.

---

> **ملاحظة للمطورين والوكلاء (AI Agents):** عند بدء أي أسبوع جديد أو إضافة ميزة، يرجى الحفاظ على معمارية Modular Monolith الصارمة (Route Handler -> Zod Validator -> Service -> Repository)، وعدم استدعاء Prisma أو كتابة منطق الأعمال داخل واجهات الـ HTTP مباشرة.

