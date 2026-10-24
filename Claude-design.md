# 🍃 Claude-Design — خطة إعادة تصميم متجر الزين للشاي

> **⚠️ قاعدة ذهبية لا تُخترق:**
> - ✅ نغير **CSS فقط** — الكلاسات، الألوان، الخطوط، المسافات، الظلال، الانيميشن
> - ✅ نغير **JSX الهيكل المرئي** فقط (ترتيب العناصر، إضافة wrapper divs للتجميل)
> - ❌ لا نمس أي **API route** أو **service** أو **hook** أو **validator** أو **schema**
> - ❌ لا نغير أي **منطق** (useCart, useSession, useQuery, fetch, signIn, signOut...)
> - ❌ لا نحذف أي **prop** أو **event handler** موجود

---

## 📐 فلسفة التصميم الجديد

**الهوية:** متجر شاي فاخر خليجي. العبوة أسود مطفي + ذهب نقش + رمال كثبان.
**الروح:** **Luxe Desert Modernism** — حداثة فاخرة بلمسة صحراوية خليجية.

### المبادئ الأساسية

| المبدأ | التطبيق |
|--------|---------|
| **Warm Dark Mode First** | خلفية داكنة دافئة (#110f0c) + تفاصيل ذهبية |
| **Glass Morphism بحذر** | بطاقات بخلفية شفافة مع blur خفيف في الهيدر |
| **Micro-animations** | hover، scroll reveal، skeleton loaders |
| **Desert Gold Palette** | التدرج الذهبي هو التوقيع البصري الوحيد |
| **Typography Hierarchy** | Cormorant للعناوين + IBM Plex Sans Arabic للنصوص |

---

## 🎨 نظام الألوان الجديد — Design Tokens

> الملف المستهدف: `src/styles/variables.css`

### الباليت الجديد

```css
/* ===== Brand — الهوية الخام (لا تتغير) ===== */
--brand-ink:        #0f0d0a;  /* أسود أعمق وأكثر دفئاً */
--brand-ink-soft:   #1a1612;
--brand-gold:       #c9a45c;  /* ذهب الشعار (يبقى) */
--brand-gold-light: #e4cb8e;
--brand-gold-deep:  #8f6d2b;
--brand-sand:       #d9bf93;
--brand-dune:       #eadfc8;
--brand-cream:      #f5ede0;  /* أكثر دفئاً من السابق */
--brand-camel:      #8b5e34;
--brand-leaf:       #5f7a4b;

/* ===== Semantic Light Mode ===== */
--color-primary:          var(--brand-gold);
--color-on-primary:       #0f0d0a;
--color-bg:               #ffffff;
--color-bg-alt:           var(--brand-cream);
--color-form:             #f0e8d6;
--color-surface-inverse:  var(--brand-ink);
--color-on-inverse:       #f0e6d3;

--color-text-primary:     #1b1510;
--color-text-secondary:   #6b5d4e;
--color-text-disabled:    #a89880;

/* ===== Semantic Dark Mode ===== */
--color-bg-dark:          #1a1612;
--color-bg-alt-dark:      #0f0d0a;
--color-form-dark:        #261f18;
--color-text-primary-dark: #f0e6d3;
--color-text-secondary-dark: #c4b49e;

/* ===== New: Glass Surface ===== */
--color-glass:            rgba(255, 255, 255, 0.06);
--color-glass-border:     rgba(201, 164, 92, 0.2);

/* ===== Gradients — لا تغيير على الأسماء ===== */
--gradient-gold: linear-gradient(135deg, #e8d08e 0%, #c9a45c 40%, #9a7230 100%);
--gradient-gold-soft: linear-gradient(135deg, #f2e5c5 0%, #e4cb8e 100%);
--gradient-ink:  linear-gradient(160deg, #1a1612 0%, #0f0d0a 100%);
--gradient-dune: linear-gradient(180deg, #f5ede0 0%, #ead8be 100%);

/* ===== New Gradients ===== */
--gradient-hero: linear-gradient(160deg, #1a1612 0%, #0f0d0a 60%, #1a1208 100%);
--gradient-card-glow: radial-gradient(ellipse at top, rgba(201,164,92,0.08) 0%, transparent 70%);
```

### التايبوغرافي المحسّن

```css
/* العنوان: Cormorant Garamond مع Reem Kufi للعربي */
--font-heading:
  var(--font-display-en), "Cormorant Garamond",
  var(--font-display-ar), "Reem Kufi",
  Georgia, serif;

/* الجسم: IBM Plex Sans Arabic (يبقى) */
--font-sans:
  var(--font-body), "IBM Plex Sans Arabic",
  "Segoe UI", system-ui, sans-serif;

/* حجم الخطوط — أكثر جرأة في العناوين */
--text-xs:   0.75rem;
--text-sm:   0.875rem;
--text-base: 1rem;
--text-lg:   1.125rem;
--text-xl:   1.375rem;
--text-2xl:  1.75rem;
--text-3xl:  2.25rem;
--text-4xl:  3rem;
--text-5xl:  4rem;
--text-6xl:  5rem;   /* جديد للـ Hero */
```

### الظلال والـ Radius المحسّنان

```css
/* ظلال بلون الذهب والحبر */
--shadow-xs:   0 1px 3px rgba(30, 20, 8, 0.08);
--shadow-sm:   0 4px 16px rgba(30, 20, 8, 0.09);
--shadow-md:   0 10px 30px rgba(30, 20, 8, 0.12);
--shadow-lg:   0 20px 50px rgba(30, 20, 8, 0.18);
--shadow-gold: 0 8px 30px rgba(201, 164, 92, 0.4);
--shadow-gold-lg: 0 16px 50px rgba(201, 164, 92, 0.25);

/* Radius أكثر انسيابية */
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   16px;
--radius-xl:   20px;
--radius-2xl:  28px;
--radius-3xl:  36px;
--radius-pill: 999px;

/* Motion محسّن */
--motion-fast:   120ms;
--motion-normal: 250ms;
--motion-slow:   500ms;
--motion-slower: 800ms;
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 📁 ملفات CSS المستهدفة

### 1. `src/styles/variables.css`
- تحديث جميع الـ tokens كما هو موضح أعلاه
- إضافة متغيرات جديدة (glass, hero gradient)
- **لا حذف** لأي متغير موجود حتى لا ينكسر أي مكون

### 2. `src/app/globals.css`
- تحديث `.ds-btn-primary` لإضافة تأثير hover أجمل
- تحديث `.ds-card` لإضافة `backdrop-blur` option
- إضافة utility classes جديدة:
  - `.ds-glass` — خلفية شفافة مع blur
  - `.ds-hero-text` — نص بتدرج ذهبي للعناوين الكبيرة
  - `.ds-section-dark` — قسم داكن بلون الحبر
  - `.ds-reveal` — انيميشن ظهور عند التمرير

---

## 📄 الصفحات والمكونات — خطة التغيير التفصيلية

---

### 🏠 الصفحة الرئيسية
**الملف:** `src/app/page.tsx`

#### قسم Hero (السطر 169–204)
**الحالي:** خلفية خضراء فاتحة (`#f4f7f3`), SVG بسيط لكوب شاي

**المطلوب:**
```
┌─────────────────────────────────────────────┐
│  خلفية: gradient داكن (#1a1612 → #0f0d0a)   │
│  ┌───────────────────┐  ┌─────────────────┐ │
│  │  النص:            │  │  صورة/SVG فاخر │ │
│  │  - العنوان بخط    │  │  كوب شاي       │ │
│  │    Cormorant كبير │  │  بدائرة ذهبية │ │
│  │    + تدرج ذهبي    │  │  متوهجة       │ │
│  │  - الوصف أبيض دافئ│  └─────────────────┘ │
│  │  - زرين: ذهبي +  │                       │
│  │    outline شفاف   │                       │
│  └───────────────────┘                       │
│  + نقاط تألق (sparkle particles) بالـ CSS   │
└─────────────────────────────────────────────┘
```

**التغييرات:**
- تغيير الـ CSS variables من `--h-bg:#f4f7f3` إلى `--h-bg:#0f0d0a`
- تحديث `--h-ink` و `--h-muted` و `--h-accent` للوضع الداكن
- إضافة `@keyframes float` للـ SVG (يطفو بهدوء)
- الزر الأول: `background: var(--gradient-gold)` + `color: #0f0d0a`
- الزر الثاني: `border: 1px solid rgba(201,164,92,0.5)` + `color: #e4cb8e`
- إضافة `text-shadow` خفيف على العنوان الرئيسي

#### قسم الفئات (السطر 207–223)
**الحالي:** خلفية `--h-deep` بسيطة، بطاقات flat

**المطلوب:**
- بطاقات بـ `backdrop-blur` خفيف وحدود ذهبية
- `hover:` يضيء الحدود وينقل البطاقة للأعلى `translateY(-4px)`
- إضافة أيقونة أو رقم عدد المنتجات على كل بطاقة فئة
- تباعد بين البطاقات أوسع (`gap-4 md:gap-6`)

#### قسم المنتجات — New Arrivals & Best Sellers
**الحالي:** عنوان + شبكة مباشرة

**المطلوب:**
- إضافة `divider` ذهبي (`.ds-dune-divider`) قبل كل قسم
- العنوان بخط أكبر مع underline ذهبي
- رابط "عرض الكل" يتحول لزر outline بحدود ذهبية عند hover
- شبكة البطاقات بـ `gap` أكبر

#### قسم لماذا الزين (Trust Signals)
**الحالي:** حدود جانبية بسيطة

**المطلوب:**
```
┌────────────────────────────────────────────┐
│  خلفية: gradient-dune (كريمي → رملي)       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │  🚚  │  │  💳  │  │  ⭐  │  │  💱  │   │
│  │أيقونة│  │أيقونة│  │أيقونة│  │أيقونة│   │
│  │ كبيرة│  │كبيرة │  │كبيرة │  │كبيرة │   │
│  │العنوان  │العنوان │العنوان │العنوان│   │
│  │الوصف │  │الوصف │  │الوصف │  │الوصف │   │
│  └──────┘  └──────┘  └──────┘  └──────┘   │
└────────────────────────────────────────────┘
```
- إضافة أيقونات Lucide مناسبة (Truck, CreditCard, Star, DollarSign)
- بطاقات بـ border وhover elevation
- الأرقام بخط كبير ذهبي

#### قسم CTA (دعوة للتسجيل)
**الحالي:** box داكن بسيط

**المطلوب:**
- خلفية: `gradient-hero` مع pattern نقاط خفية بالـ CSS
- العنوان: `ds-text-gold` (تدرج ذهبي)
- نص ثانوي: لون كريمي فاتح
- الزر: كبير بتدرج ذهبي مع `shadow-gold`
- إضافة حدود ذهبية خفية على الـ container

---

### 🧭 Navbar
**الملف:** `src/components/organisms/Navbar.tsx`

**الحالي:** sticky، يصبح بظل عند التمرير، خلفية عادية

**المطلوب:**
```
┌─────────────────────────────────────────────────────┐
│  [Logo]    [Home] [Products] [About] [•••]  [🛒][👤] │
│  الخلفية: شفافة عند الأعلى، تصبح glass عند التمرير  │
└─────────────────────────────────────────────────────┘
```

**التغييرات:**
- **Transparent → Glass:** عند top=0: `background: transparent`، عند scroll: `background: rgba(15,13,10,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--color-glass-border)`
- **اللوغو:** أكبر قليلاً مع `transition: opacity`
- **روابط الناف:** hover يضيف underline ذهبي متحرك (من اليسار)
- **زر السلة:** badge عدد العناصر بلون ذهبي
- **القائمة الجانبية (موبايل):** خلفية داكنة (#0f0d0a) بدل الأبيض، روابط بيضاء دافئة
- `h-20` يبقى كما هو (height لا يتغير)

---

### 🔻 Footer
**الملف:** `src/components/organisms/Footer.tsx`

**الحالي:** `<div>Footer</div>` — **فارغ تماماً!**

**المطلوب — بناء Footer كامل:**
```
┌──────────────────────────────────────────────────────┐
│  ████████████████████ FOOTER DARK ████████████████   │
│                                                      │
│  [شعار الزين]  [روابط سريعة]  [تواصل]  [وسائل دفع] │
│                                                      │
│  الزين للشاي   المنتجات       واتساب    [Visa][mada] │
│  نص وصف قصير  الفئات         إيميل     [Apple Pay]   │
│               عن المتجر      إنستغرام               │
│               تواصل معنا                             │
│  ──────────────────────────────────────────────────  │
│         © 2025 الزين للشاي — جميع الحقوق محفوظة      │
└──────────────────────────────────────────────────────┘
```

**التفاصيل:**
- خلفية: `var(--brand-ink)` (#0f0d0a)
- `border-top: 1px solid var(--color-glass-border)`
- الشعار: أبيض + الوصف رمادي دافئ
- روابط: لون `--color-on-inverse` مع hover ذهبي
- حاجز بين القسمين: `.ds-gold-rule` المبهت
- أيقونات وسائل الدفع: SVG أبيض
- حق النشر: نص صغير مركزي بلون خافت
- **ملاحظة:** روابط الفوتر ثابتة (لا تتغير من API)

---

### 🛍️ صفحة المنتجات (Catalog)
**الملف:** `src/components/shop/ProductsCatalog.tsx`

**المطلوب:**
- Header الصفحة: عنوان كبير + breadcrumb خفيف
- شريط الفلاتر: خلفية كريمية (`color-bg-alt`) مع border سفلي
- بطاقات التصفية (chips): rounded-pill بلون `color-primary-200` وhover ذهبي
- sidebar الفلاتر (موبايل): خلفية بيضاء/داكنة مع shadow جانبي
- زر "تطبيق": ds-btn-primary
- pagination: أرقام بدوائر بسيطة، الصفحة الحالية بذهبي

---

### 🃏 بطاقة المنتج
**الملف:** `src/components/shop/ProductCard.tsx`

**الحالي:**
```
┌─────────────────┐
│  [صورة مربعة]   │
│  اسم المنتج     │
│  السعر          │
└─────────────────┘
```

**المطلوب:**
```
┌──────────────────────────┐
│  ┌────────────────────┐  │
│  │  [صورة 4:5]        │  │
│  │  [badge خصم]       │  │
│  │  [زر مفضلة ❤]     │  │
│  └────────────────────┘  │
│                          │
│  الفئة (خط صغير رمادي)   │
│  اسم المنتج (bold)        │
│  السعر ── السعر القديم    │
│                          │
│ hover: ترتفع البطاقة +4px │
│         ظل ذهبي يظهر     │
└──────────────────────────┘
```

**التغييرات:**
- نسبة الصورة: `aspect-[4/5]` بدل `aspect-square`
- `border-radius` أكبر: `var(--radius-xl)`
- hover effect:
  ```css
  transition: transform 200ms ease, box-shadow 200ms ease;
  transform: translateY(-4px);
  box-shadow: var(--shadow-gold);
  ```
- badge الخصم: لون الذهب الغامق `brand-gold-deep`
- زر المفضلة: يظهر دائماً بحجم مناسب

---

### 📦 صفحة تفاصيل المنتج
**الملف:** `src/app/(shop)/products/[slug]/page.tsx`

**المطلوب:**
- Breadcrumb: خط صغير مع separator خفيف
- الصور (Gallery): تكبير للعرض، thumbnail strip في الأسفل
- اسم المنتج: خط heading كبير (text-3xl/4xl)
- السعر: كبير bold مع السعر القديم بخط strikethrough رمادي
- badge "وفّر X%": دائرة ذهبية صغيرة
- حالة المخزون: خضراء `color-success` أو حمراء `color-danger`
- فاصل أفقي ذهبي `.ds-gold-rule` بين الأقسام
- المواصفات (SKU, Brand): جدول خفيف بـ `border-b`

---

### 🔐 صفحات المصادقة

#### تسجيل الدخول
**الملف:** `src/components/auth/LoginForm.tsx`

**الحالي:** بطاقة بيضاء بسيطة + Leaf icon

**المطلوب:**
```
┌─────────────────────────────────────────┐
│  خلفية الصفحة: gradient-dune           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [أيقونة الشعار أو ورقة شاي]    │  │
│  │  مرحباً بعودتك                   │  │
│  │  سجّل دخولك لمتابعة تسوّقك       │  │
│  │                                   │  │
│  │  [📧 البريد الإلكتروني]          │  │
│  │  [🔒 كلمة المرور]   [نسيت؟]     │  │
│  │                                   │  │
│  │  [زر تسجيل الدخول — ذهبي]       │  │
│  │                                   │  │
│  │  ليس لديك حساب؟ [إنشاء حساب]    │  │
│  │  [متابعة كضيف]                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**التغييرات:**
- خلفية الصفحة: `background: var(--gradient-dune)` بدل `--color-bg-alt`
- البطاقة: `border: 1px solid var(--color-glass-border)` + `shadow-lg`
- الأيقونة العلوية: خلفية ذهبية خفيفة (`color-primary-200`) بدائرة أكبر
- حقول الإدخال: `border-radius: var(--radius-lg)` + focus ring ذهبي
- زر تسجيل الدخول: `ds-btn-primary` بالكامل (gradient ذهبي)

#### إنشاء حساب / نسيت كلمة المرور / إعادة الضبط
**الملفات:** `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`

نفس تصميم LoginForm — consistency مهم. تغييرات متطابقة.

---

### 🛒 صفحة السلة
**الملف:** `src/components/shop/CartView.tsx`

**المطلوب:**
```
┌─────────────────────────────────────────────────────┐
│  سلة التسوق (3 منتجات)                              │
│                                                     │
│  ┌─────────────────────────────┐  ┌──────────────┐ │
│  │ [صورة] اسم المنتج           │  │  ملخص الطلب  │ │
│  │         الخيار / الكمية ±   │  │  ──────────  │ │
│  │         السعر     [حذف🗑]  │  │  المجموع     │ │
│  │─────────────────────────── │  │  الشحن إلى   │ │
│  │ [صورة] منتج 2              │  │  [بلد Selector│ │
│  │─────────────────────────── │  │  ──────────  │ │
│  │  [متابعة التسوق]            │  │  الإجمالي    │ │
│  └─────────────────────────── │  │  [إتمام الشراء│ │
│                                │  └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

**التغييرات:**
- عنوان الصفحة: `ds-text-3xl ds-font-heading`
- بطاقة كل منتج: border-bottom بدل box كامل (أخف وأنظف)
- أزرار الكمية +/−: دوائر صغيرة `rounded-full border border-[color-form]`
- زر الحذف: أيقونة فقط بدون نص، لون خافت + hover أحمر
- بطاقة الملخص: sticky على الـ desktop، `border: 1px solid var(--border-color)` + `shadow-sm`
- زر إتمام الشراء: `ds-btn-primary` كامل العرض بارتفاع 52px

**السلة الفارغة:**
```
┌────────────────────────────────┐
│  [أيقونة سلة كبيرة 🛒]         │
│  سلتك فارغة                    │
│  لم تضف أي منتج بعد           │
│  [تصفّح المنتجات]               │
└────────────────────────────────┘
```
- أيقونة: 80px مع لون خفيف
- خلفية القسم: `color-bg-alt`

---

### 💳 صفحة الدفع (Checkout)
**الملف:** `src/components/checkout/CheckoutView.tsx`

**المطلوب — مؤشر الخطوات:**
```
[1. العنوان] ──● [2. الشحن] ──○ [3. الدفع] ──○ [4. المراجعة]
   (مكتمل)        (نشط)          (قادم)         (قادم)
```

**التفاصيل:**
- الخطوات: دوائر صغيرة (`w-8 h-8`) مع خطوط واصلة
  - مكتمل: خلفية ذهبية + ✓
  - نشط: خلفية ذهبية بـ ring خارجي
  - قادم: border رمادي
- حقول النموذج: `ds-input` المحدّث (radius أكبر)
- ملخص الطلب الجانبي: sticky + border ذهبي خفيف
- زر "التالي": `ds-btn-primary` + arrow icon
- رسالة خطأ: بـ `alert` لون أحمر مع border

---

### 👤 صفحة الحساب الشخصي
**الملف:** `src/components/shop/MyAccount.tsx`

**الحالي:** border zinc بسيط

**المطلوب:**
```
┌──────────────────────────────────────────────┐
│  ┌────────┐  أحمد محمد                        │
│  │ avatar │  ahmed@email.com                  │
│  │  حرف  │  عميل مميز                        │
│  └────────┘                        [تسجيل الخروج]
├──────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │  📦 طلباتي       │  │  ❤ المفضلة       │  │
│  │  اضغط لعرضها    │  │  اضغط لعرضها    │  │
│  └──────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────┘
```

**التغييرات:**
- `border-zinc-200` → `border-[var(--border-color)]`
- Avatar: خلفية `ds-bg-primary` (gradient ذهبي) + نص أسود
- بطاقات الروابط: hover `border-[var(--color-primary)]` + shadow خفيف
- أيقونات: لون `--color-primary` بدل `zinc-500`
- زر تسجيل الخروج: `ds-btn-outline` بدل border-zinc

---

### 📋 صفحة الطلبات
**الملف:** `src/components/shop/MyOrdersList.tsx`

**المطلوب:**
- بطاقة كل طلب: border + `radius-lg` + hover shadow خفيف
- Status badge: يستخدم `ds-badge` + الألوان المناسبة
- رقم الطلب: `font-mono tabular-nums ds-text-sm`
- تاريخ الطلب: لون ثانوي
- المبلغ الإجمالي: bold ذهبي
- زر "عرض التفاصيل": `ds-btn-ghost` أو link underline

---

### 📦 صفحة تفاصيل الطلب
**الملف:** `src/components/shop/MyOrderDetail.tsx`

**المطلوب:**
- Header: رقم الطلب كبير + status badge + تاريخ
- Progress bar للحالة (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- جدول المنتجات: صورة مصغرة + اسم + الكمية + السعر
- ملخص الأسعار: يمين في box مستقل
- عنوان التوصيل: بطاقة بـ border

---

### ❤️ قائمة المفضلة
**الملف:** `src/components/shop/MyWishlist.tsx`

**المطلوب:**
- عنوان الصفحة + عدد العناصر
- شبكة `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- نفس `ProductCard` مع إضافة زر "إضافة إلى السلة" فوق الصورة عند hover
- empty state: قلب كبير + رسالة + رابط للتسوق

---

### 🗂️ صفحة الفئة
**الملف:** `src/app/(shop)/category/[slug]/page.tsx`

**الحالي:** header + breadcrumb بسيطان

**المطلوب:**
- Header banner: خلفية `gradient-ink` مع اسم الفئة كبير بخط heading + صورة الفئة على اليمين
- Breadcrumb: خط صغير مع separator مخصص (›) بدل (/)
- أزرار الفئات الفرعية: `rounded-pill` بـ hover ذهبي
- شبكة المنتجات: نفس ProductCard المحسّن

---

### 🏢 لوحة الإدارة

#### الـ Sidebar
**الملف:** `src/components/admin/AdminSidebar.tsx`

**الحالي:** border-black/10، روابط gray

**المطلوب:**
```
┌──────────────────┐
│  [ز] الزين للشاي │
│      لوحة الإدارة│
├──────────────────┤
│  🏠 لوحة التحكم  │  ← نشط: bg ذهبي + text أسود
│  🛍 الطلبات      │  ← hover: bg خفيف
│  📦 المنتجات     │
│  📁 الفئات       │
│  ⭐ المراجعات    │
├──────────────────┤
│  🏪 عرض المتجر   │
│  🚪 تسجيل الخروج │
│  Ahmed · مدير    │
└──────────────────┘
```

**التغييرات:**
- الرابط النشط: `background: var(--gradient-gold); color: var(--brand-ink)` بدل `bg-primary text-white`
- الرابط hover: `background: var(--color-primary-200)`
- Avatar الشعار: خلفية `gradient-gold` بدل `color-primary`
- تأثير الانتقال على الروابط: `transition: all 150ms ease`

#### Dashboard Stats
**الملف:** `src/components/admin/DashboardStats.tsx`

**التغييرات:**
- `card` class: `rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg)] shadow-[var(--shadow-sm)]`
- متغير `muted`: `text-[var(--color-text-secondary)]`
- Bar component: `bg-[var(--color-primary)]` يبقى، `bg-black/5` → `bg-[var(--color-form)]`
- أرقام الإحصاء: خط heading bold كبير بلون primary

#### جداول الإدارة (Products, Orders, Categories, Reviews)
**الملفات:** `ProductsTable.tsx`, `OrdersTable.tsx`, `CategoriesTable.tsx`, `ReviewsTable.tsx`

**التغييرات المشتركة:**
- Header الجدول: `bg-[var(--color-bg-alt)] border-b border-[var(--border-color)]`
- صفوف الجدول: hover `bg-[var(--color-primary-200)]/30`
- الـ badges: استخدام `ds-badge` و variants الموجودة
- أزرار الإجراءات: `ds-btn-ghost` بدل custom styles

---

### ℹ️ صفحة عن المتجر (About)
**الملف:** `src/app/(shop)/about/page.tsx`

**الحالي:** فارغة (TODO)

**المطلوب — بناء الصفحة كاملاً:**
```
┌──────────────────────────────────────────────┐
│  [Hero داكن] قصة الزين للشاي                │
│  خلفية gradient-ink + عنوان كبير             │
├──────────────────────────────────────────────┤
│  [قسم كريمي] رسالتنا                         │
│  نص وصف + صورة جانبية                        │
├──────────────────────────────────────────────┤
│  [قسم داكن] أرقامنا                          │
│  6 دول  |  100+ منتج  |  1000+ عميل          │
├──────────────────────────────────────────────┤
│  [قسم كريمي] قيمنا                           │
│  3-4 بطاقات بأيقونات                         │
└──────────────────────────────────────────────┘
```

---

### 📬 صفحة التواصل
**الملف:** `src/app/(shop)/contact/page.tsx`

**الحالي:** فارغة (TODO)

**المطلوب:**
```
┌────────────────────────────────────────────────┐
│  تواصل معنا — عنوان داكن Hero صغير            │
├────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌────────────────┐ │
│  │  نموذج التواصل:      │  │  طرق التواصل:  │ │
│  │  [الاسم]             │  │  📧 إيميل      │ │
│  │  [البريد]            │  │  📱 واتساب     │ │
│  │  [الموضوع]           │  │  🕒 ساعات العمل│ │
│  │  [الرسالة]           │  └────────────────┘ │
│  │  [إرسال]             │                     │
│  └──────────────────────┘                     │
└────────────────────────────────────────────────┘
```

**ملاحظة:** النموذج مكوّن JSX بحت — لا يتصل بـ API (الصفحة فارغة في الكود الأصلي)

---

### ❓ صفحة الأسئلة الشائعة
**الملف:** `src/app/(shop)/faq/page.tsx`

**الحالي:** فارغة (TODO)

**المطلوب:**
- Hero صغير داكن
- Accordion قابل للفتح لكل سؤال:
  - Header: سؤال + سهم يدور
  - Body: إجابة مع تحريك الارتفاع
  - border-bottom بين الأسئلة
- تقسيم الأسئلة لمجموعات (شحن، دفع، منتجات...)

---

### 🚫 صفحة 404
**الملف:** `src/app/not-found.tsx`

**الحالي:** Lottie animation + عنوان + زر

**المطلوب:**
- خلفية: `gradient-dune` بدل flat
- النص: خط heading مع لمسة ذهبية على "404"
- الزر: `ds-btn-primary` (gradient ذهبي)
- تأثير طفو خفيف على الـ Lottie container

---

### ✅ صفحة نتيجة الـ Checkout (Success / Cancel)
**الملف:** `src/components/checkout/CheckoutResult.tsx`

**Success المطلوب:**
```
┌────────────────────────────────┐
│  ✅ (دائرة خضراء كبيرة)        │
│  تم تأكيد طلبك بنجاح!         │
│  رقم الطلب: #12345             │
│  [تتبع طلبك] [متابعة التسوق]  │
└────────────────────────────────┘
```

**Cancel المطلوب:**
```
┌────────────────────────────────┐
│  ❌ (دائرة حمراء)               │
│  تم إلغاء عملية الدفع           │
│  [الرجوع للسلة] [تواصل معنا]   │
└────────────────────────────────┘
```

---

## 🧩 المكونات الذرية (Atoms)

### Button
**الملف:** `src/components/atoms/Button.tsx`

**الحالي:** `ds-bg-primary text-white` (الأزرق من Tailwind افتراضي!)

**المطلوب:**
- `primary`: `background: var(--gradient-gold); color: var(--brand-ink); box-shadow: var(--shadow-gold)`
- `secondary`: `background: var(--brand-ink); color: var(--brand-gold-light)`
- `hover` على كليهما: `transform: translateY(-1px)` + shadow أعمق
- `disabled`: `opacity: 0.5; cursor: not-allowed; transform: none`
- الـ sizes تبقى نفسها

### Text, Title
**الملفات:** `Text.tsx`, `Title.tsx`

- التأكد أنها تستخدم `var(--color-text-primary)` و `var(--font-heading)` بشكل صحيح
- لا تغيير كبير

---

## 🎯 أولويات التنفيذ

### المرحلة 1 — الأساس (الأعلى تأثيراً)
1. `variables.css` — تحديث الـ tokens
2. `globals.css` — تحديث المكونات العامة + utility classes
3. `Navbar.tsx` — Glass effect + Dark mode
4. `Footer.tsx` — بناء من الصفر
5. `page.tsx` (Homepage) — Hero جديد

### المرحلة 2 — المنتجات
6. `ProductCard.tsx` — بطاقة محسّنة
7. `ProductsCatalog.tsx` — صفحة الكتالوج
8. `ProductPurchasePanel.tsx` — لوحة الشراء

### المرحلة 3 — المستخدم
9. `LoginForm.tsx` + `RegisterForm.tsx` + `ForgotPasswordForm.tsx`
10. `CartView.tsx` — السلة
11. `CheckoutView.tsx` — الدفع
12. `MyAccount.tsx` + `MyOrdersList.tsx` + `MyWishlist.tsx`

### المرحلة 4 — الإدارة
13. `AdminSidebar.tsx`
14. `DashboardStats.tsx`
15. الجداول الإدارية

### المرحلة 5 — الصفحات الثانوية
16. `about/page.tsx` — بناء الصفحة
17. `contact/page.tsx` — بناء النموذج
18. `faq/page.tsx` — Accordion
19. `not-found.tsx` — تحسين
20. `CheckoutResult.tsx` — Success/Cancel

---

## 📌 ملاحظات تقنية مهمة

### ما يجوز وما لا يجوز

```
✅ يجوز:
- تغيير className strings في JSX
- إضافة wrapper <div> لأغراض تصميمية
- تغيير inline styles/CSS variables
- إضافة @keyframes في CSS
- إضافة utility classes جديدة في globals.css
- تغيير قيم variables.css

❌ محظور:
- تغيير أي function أو hook
- تغيير أي API call أو fetch
- تغيير props المُمرَّرة للمكونات
- حذف أي event handler
- تغيير أي منطق شرطي
- المساس بـ prisma/ أو api/ أو services/ أو lib/
- تغيير next.config.ts أو package.json
```

### تعارضات بصرية حالية يجب حلها

1. **Homepage** تستخدم CSS variables مخصصة (`--h-bg`, `--h-ink`...) داخل `<style>` inline — يجب توحيدها مع الـ design tokens الرسمية أو الإبقاء عليها وتغيير قيمها فقط
2. **Button.tsx** يستخدم `text-white` بالنص لكن `ds-bg-primary` للخلفية — بعد تحديث `ds-bg-primary` للذهب يجب تغيير `text-white` إلى `text-[var(--color-on-primary)]` (أسود)
3. **ProductCard** و **HomePage.ProductCard** هما مكونان منفصلان بتصميمين مختلفين — يجب توحيدهما

### الخطوط (Fonts)
الخطوط مُضبوطة في `layout.tsx` عبر Next.js font system. `variables.css` تُشير إليها بـ:
- `var(--font-body)` ← IBM Plex Sans Arabic
- `var(--font-display-en)` ← Cormorant Garamond
- `var(--font-display-ar)` ← Reem Kufi

**لا تغيير مطلوب على الخطوط** — فقط التأكد أن المكونات تستخدم `var(--font-heading)` للعناوين

### Dark Mode
المشروع يدعم Dark Mode عبر `.dark` class على `<html>`.
- `variables.css` لديها `:root.dark` block جاهز
- أي تحديث للـ dark mode يكون في ذلك القسم فقط
- تجنب `dark:` Tailwind utilities — استخدم CSS variables

---

## 📊 ملخص الملفات التي تحتاج تعديل

| الملف | نوع التغيير | الأولوية |
|-------|-------------|---------|
| `src/styles/variables.css` | تحديث tokens | 🔴 عالية |
| `src/app/globals.css` | تحديث utilities + components | 🔴 عالية |
| `src/components/organisms/Navbar.tsx` | glass effect + dark | 🔴 عالية |
| `src/components/organisms/Footer.tsx` | بناء من صفر | 🔴 عالية |
| `src/app/page.tsx` | hero + sections | 🔴 عالية |
| `src/components/shop/ProductCard.tsx` | hover + layout | 🟠 متوسطة |
| `src/components/atoms/Button.tsx` | gold gradient | 🟠 متوسطة |
| `src/components/auth/LoginForm.tsx` | redesign | 🟠 متوسطة |
| `src/components/auth/RegisterForm.tsx` | redesign | 🟠 متوسطة |
| `src/components/auth/ForgotPasswordForm.tsx` | redesign | 🟠 متوسطة |
| `src/components/auth/ResetPasswordForm.tsx` | redesign | 🟠 متوسطة |
| `src/components/shop/CartView.tsx` | polish | 🟡 منخفضة |
| `src/components/checkout/CheckoutView.tsx` | steps + polish | 🟡 منخفضة |
| `src/components/shop/MyAccount.tsx` | border colors | 🟡 منخفضة |
| `src/components/shop/MyOrdersList.tsx` | card style | 🟡 منخفضة |
| `src/components/shop/MyWishlist.tsx` | grid + card | 🟡 منخفضة |
| `src/components/admin/AdminSidebar.tsx` | gold active state | 🟡 منخفضة |
| `src/components/admin/DashboardStats.tsx` | card tokens | 🟡 منخفضة |
| `src/app/(shop)/about/page.tsx` | بناء الصفحة | 🟡 منخفضة |
| `src/app/(shop)/contact/page.tsx` | بناء النموذج | 🟡 منخفضة |
| `src/app/(shop)/faq/page.tsx` | accordion | 🟡 منخفضة |
| `src/app/not-found.tsx` | polish | 🟡 منخفضة |
| `src/components/checkout/CheckoutResult.tsx` | success/cancel | 🟡 منخفضة |
| `src/components/shop/ProductsCatalog.tsx` | filter bar polish | 🟡 منخفضة |

---

*آخر تحديث: أكتوبر 2025 — خطة التصميم بواسطة Antigravity IDE*
