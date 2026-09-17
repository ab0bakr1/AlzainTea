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
- **نظام دفع ذكي متعدد المزودين (Adapter/Strategy Pattern):** طبقة دفع موحدة (`PaymentProvider`) تدعم **Stripe** للعملاء الدوليين (US, GB) مع الاستعداد لربط البوابة الخليجية المحلية (**Tap Payments / Moyasar** لدعم Apple Pay و Mada).
- **إتمام شراء متكامل وآمن (Checkout & Stock Reservation):** إعادة احتساب كاملة للأسعار، الضرائب (VAT)، الشحن، والخصومات على الخادم، مع حجز فوري للمخزون (`reservedStock`) داخل معاملة Prisma واحدة لمنع البيع الزائد (Overselling).
- **تعدد العملات وحساب الشحن الديناميكي:** عرض الأسعار وتحويلها بعملات متعددة (SAR, OMR, AED, KWD, BHD, QAR, USD, EUR, GBP) مع حساب تكلفة وأيام الشحن المتوقعة حسب الدولة.
- **سلة مشتريات ذكية ومتزامنة (Cart System):** إدارة السلة عبر Zustand محلياً مع دعم المفاتيح المتعددة (`guest` و `userId`)، ودمج تلقائي عند تسجيل الدخول (`cart-merge.ts`)، وتحقق لحظي من المخزون والأسعار عبر `/api/cart/validate`.
- **نظام كوبونات وعناوين متطور:** التحقق الصارم من شروط الكوبونات (حد أدنى، حد استخدام عام ولكل مستخدم، تاريخ الصلاحية)، وإدارة العناوين مع حماية الملكية للمستخدم المسجل.
- **لوحة تحكم إدارية متكاملة (Admin Dashboard):** لإدارة المنتجات، الفئات الهرمية، متابعة الطلبات، وتحديث حالات الشحن والمخزون، مع حماية أمنية متعددة الطبقات (Defense in Depth).

---

## 🛠️ 2. المكدس التقني (Tech Stack)

| المجال | التقنية المستخدمة | التفاصيل والغرض |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.1.6 (App Router)** | إطار العمل الأساسي، Server Components و Client Components و Route Handlers |
| **Language** | **TypeScript 5** | فحص صارم للأنواع ومشاركة واجهات البيانات بين الـ Backend والـ Frontend |
| **UI Library** | **React 19.2.3** | أحدث إصدار مع دعم React Actions والـ Hooks المتقدمة |
| **Styling** | **Tailwind CSS v4 + PostCSS** | تنسيق سريع وحديث مع متغيرات التصميم في `src/styles/variables.css` |
| **Database & ORM** | **PostgreSQL (Neon) + Prisma 7** | قاعدة بيانات علائقية متقدمة مع Prisma Client كـ ORM رئيسي ومخطط متكامل |
| **Validation** | **Zod 4** | التحقق الصارم من مدخلات الـ API، ونماذج الـ Frontend عبر `@hookform/resolvers` |
| **State Management** | **Zustand 5** | إدارة حالة السلة واختيار الدولة (`cart-store.ts`, `useCountry.ts`) |
| **Cart Persistence & Sync** | **Local Storage + Custom Merge** | إدارة السلة محلياً مع دعم دمج سلة الزائر مع حساب المستخدم عند تسجيل الدخول |
| **Data Fetching & Cache**| **TanStack React Query 5 + Axios** | استعلامات الخادم في الواجهة، كاش ذكي، وإلغاء الاستعلامات التلقائي |
| **Authentication** | **NextAuth.js (v4 JWT)** | إدارة الجلسات، الأدوار (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`) وحماية المسارات |
| **Password Hashing** | **Argon2 (argon2id)** | تشفير فائق الأمان لكلمات المرور وفق معايير OWASP (مع دعم fallback لـ bcrypt) |
| **Rate Limiting** | **Upstash Redis + @upstash/ratelimit** | حماية مسارات المصادقة والدفع من الهجمات وهجمات التخمين |
| **Payments** | **Stripe (مفعّل) + Tap / Moyasar (V2)** | نمط Strategy Provider موحد، مع معالجات Webhook Idempotent لتأكيد الدفع وخصم المخزون |
| **Localization (i18n)**| **next-intl** | الترجمة وتعدد اللغات مع ملفات الرسائل في `src/messages/` وتوافق كامل مع اتجاه RTL |
| **Theme** | **next-themes** | دعم الوضع الداكن والفاتح (Dark / Light Mode) |
| **Animations** | **GSAP + Lottie** | مؤثرات حركية فاخرة (`@lottiefiles`, `lottie-react`, `gsap`) |
| **Icons** | **Lucide React + React Icons + Iconify** | حزمة أيقونات عصرية للمتجر ولوحة الإدارة |

---

## 📂 3. البنية المعمارية وهيكل المجلدات (Project Architecture)

المشروع مبني وفق معمارية Modular Monolith ونمط التصميم الذري (Atomic Design):

```text
alzainTea/
├── prisma/
│   ├── migrations/                  # سجل هجرات قاعدة البيانات
│   ├── schema.prisma                # المخطط الكامل (11 نموذجاً و 6 Enums)
│   └── seed.ts                      # بذر البيانات الأولية (أصناف، منتجات، متغيرات، مستخدمين)
├── public/
│   ├── assets/                      # أصول الوسائط (صور وأيقونات وملفات Lottie)
│   └── favicon.ico
├── src/
│   ├── animations/                  # خطافات وحركات GSAP
│   ├── app/                         # App Router الخاص بـ Next.js
│   │   ├── (auth)/                  # مسارات المصادقة
│   │   │   ├── login/page.tsx       # تسجيل الدخول
│   │   │   ├── register/page.tsx    # تسجيل حساب جديد
│   │   │   └── forgot-password/     # استعادة كلمة المرور
│   │   ├── (public)/                # صفحات عامة ثابتة (about, faqs, pricing)
│   │   ├── (shop)/                  # صفحات المتجر الموجهة للعميل
│   │   │   ├── layout.tsx           # تخطيط المتجر الرئيسي (Header + Footer + CartDrawer)
│   │   │   ├── products/            # دليل المنتجات والبحث والفلترة ([slug] للتفاصيل)
│   │   │   ├── category/            # تصفح المنتجات حسب الفئة
│   │   │   ├── cart/                # صفحة مراجعة سلة المشتريات
│   │   │   ├── checkout/            # مسار الدفع والشحن
│   │   │   │   ├── cancel/          # صفحة إلغاء الدفع
│   │   │   │   ├── success/         # صفحة نجاح الدفع وتأكيد الطلب
│   │   │   │   └── page.tsx         # صفحة Checkout الرئيسية
│   │   │   └── account/             # الملف الشخصي والطلبات والعناوين
│   │   ├── admin/                   # شاشات لوحة تحكم الإدارة (محمية بـ ADMIN)
│   │   │   ├── categories/          # إدارة وتعديل وإنشاء الفئات
│   │   │   ├── products/            # إدارة المنتجات (قائمة، جديد، وتعديل [id])
│   │   │   ├── orders/              # إدارة ومتابعة الطلبات وتحديث حالاتها
│   │   │   └── page.tsx             # لوحة الإحصائيات العامة
│   │   ├── api/                     # واجهات الـ HTTP الخلفية (Route Handlers)
│   │   │   ├── addresses/           # GET (قائمة عناوين المستخدم) و POST (إضافة عنوان)
│   │   │   │   └── [id]/            # PATCH (تعديل) و DELETE (حذف عنوان)
│   │   │   ├── admin/               # مسارات إدارية محمية
│   │   │   │   ├── categories/      # GET (قائمة الإدارة) و POST (إنشاء فئة)
│   │   │   │   │   └── [id]/        # GET, PATCH, DELETE للفئة
│   │   │   │   └── products/        # GET (قائمة الإدارة كاملة) و POST (إضافة منتج)
│   │   │   │       └── [id]/        # GET, PATCH, DELETE للمنتج
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
│   │   │   ├── orders/              # إنشاء واسترجاع الطلبات
│   │   │   ├── products/            # GET قائمة المنتجات العامة مع البحث والفلترة
│   │   │   │   ├── [slug]/          # GET تفاصيل منتج معين بالـ slug
│   │   │   │   └── facets/          # GET حدود الأسعار والفئات المتاحة ديناميكياً
│   │   │   ├── shipping/
│   │   │   │   └── calculate/       # GET حاسبة رسوم وأيام الشحن حسب الدولة
│   │   │   └── webhooks/
│   │   │       ├── stripe/          # POST معالج إشعارات Stripe الموقعة رقمياً
│   │   │       └── local-gateway/   # POST معالج إشعارات البوابة الخليجية (جاهز للربط)
│   │   ├── globals.css              # ملف التنسيق العام و Tailwind
│   │   ├── layout.tsx               # Root Layout
│   │   └── page.tsx                 # الصفحة الرئيسية (Landing Page)
│   ├── components/                  # مكونات الواجهة
│   │   ├── admin/                   # مكونات الإدارة (ProductsTable, ProductForm, CategoriesTable, CategoryForm, OrdersTable)
│   │   ├── atoms/                   # أصغر العناصر (Button, Text, Title, Icon, Images)
│   │   ├── molecules/               # عناصر مركبة (SearchBox, NavItem, FormField)
│   │   ├── organisms/               # هياكل كاملة (Navbar, Footer)
│   │   ├── shop/                    # مكونات المتجر (ProductCard, ProductGrid, ProductFilters, ProductSearch, Pagination, CartDrawer, CountrySelector, CurrencySelector)
│   │   ├── checkout/                # مكونات الدفع والشحن (PaymentMethodPicker, ShippingCalculator, VatField)
│   │   ├── layout/                  # مكونات التخطيط واللغات
│   │   └── ui/                      # مكونات الأساس المشتركة (Dialog, Dropdown, Skeleton)
│   ├── hooks/                       # الخطافات المخصصة
│   │   ├── useCart.ts               # الواجهة البرمجية الموحدة لاستخدام السلة في المكونات
│   │   ├── useCartAuthSync.ts       # مزامنة السلة تلقائياً ودمجها عند تسجيل الدخول
│   │   ├── useCountry.ts            # إدارة دولة العميل الحالية
│   │   ├── useProducts.ts           # جلب المنتجات عبر TanStack Query
│   │   └── useProductFiltersUrl.ts  # مزامنة فلاتر البحث والترتيب مع عنوان URL
│   ├── lib/                         # المكتبات المشتركة والأدوات المساعدة
│   │   ├── api-error.ts             # فئات أخطاء الـ API الموحدة
│   │   ├── api-response.ts          # دوال التنسيق القياسي للاستجابات (ok, fail, validationError)
│   │   ├── auth.ts                  # تكوين NextAuth
│   │   ├── cart-merge.ts            # منطق دمج سلة الزائر مع سلة المستخدم في التخزين المحلي
│   │   ├── cn.tsx                   # دمج كلاسات Tailwind
│   │   ├── currency.ts              # تحويل العملات وتنسيق الوحدات الصغرى
│   │   ├── password.ts              # تشفير وفحص كلمات المرور عبر Argon2id
│   │   ├── payment-gateway.ts       # محولات بوابات الدفع الخليجية
│   │   ├── prisma.ts                # كائن Prisma Client المفرد (Singleton)
│   │   ├── rate-limit.ts            # تقييد معدل الطلبات عبر Upstash Redis
│   │   ├── require-admin.ts         # حماية المسارات الإدارية والتحقق من صلاحية ADMIN
│   │   ├── shipping-rates.ts        # جدول أسعار الشحن والبلدان المدعومة
│   │   └── stripe.ts                # تهيئة Stripe SDK
│   ├── modules/                     # طبقة منطق الأعمال والوصول لقاعدة البيانات (Modular Monolith)
│   │   ├── addresses/               # مستودع وخدمة العناوين (address.repository.ts, address.service.ts, address.validators.ts)
│   │   ├── auth/                    # خدمة ومتحققات المصادقة (auth.service.ts, auth.validators.ts)
│   │   ├── cart/                    # خدمة التحقق من السلة (cart.service.ts, cart.validators.ts)
│   │   ├── categories/              # مستودع وخدمة الفئات (category.repository.ts, category.service.ts, category.validators.ts)
│   │   ├── checkout/                # خدمة ومستودع إتمام الشراء وحجز المخزون (checkout.service.ts, checkout.repository.ts, checkout.validators.ts)
│   │   ├── coupons/                 # خدمة ومستودع فحص الكوبونات (coupon.service.ts, coupon.repository.ts, coupon.validators.ts)
│   │   ├── payments/                # طبقة الدفع الموحدة ومزود Stripe (payment.service.ts, payment.types.ts, providers/stripe.provider.ts)
│   │   ├── products/                # مستودع وخدمة المنتجات (product.repository.ts, product.service.ts, product.validators.ts)
│   │   └── shipping/                # خدمة ومتحققات الشحن (shipping.service.ts, shipping.validators.ts)
│   ├── services/                    # طبقة استدعاء الـ API من الواجهة الأمامية (products.service.ts, categories.service.ts)
│   ├── store/                       # مخازن الحالة العامة (cart-store.ts)
│   ├── styles/                      # متغيرات نظام التصميم (variables.css)
│   └── types/                       # تعريفات TypeScript العامة (cart.d.ts, next-auth.d.ts, global.d.ts)
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

  @@index([userId])
  @@index([status])
  @@index([paymentStatus])
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
  @@index([productId])
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
   - التحقق من الصلاحية، الجلسة، وتقييد معدل الطلبات (Rate Limiting).
   - التحقق من هيكل البيانات عبر `Zod Schema`.
   - استدعاء دالة الـ Service المناسبة.
   - إرجاع الرد عبر `ok(data, meta)` أو اصطياد الخطأ عبر `fail(error)`.
   - **قاعدة صارمة**: يُمنع منعاً باتاً كتابة منطق أعمال أو استعلامات Prisma مباشرة داخل Route Handler.

2. **Validators (`src/modules/*/*.validators.ts`)**:
   - مخططات Zod صارمة للمدخلات والبحث والإنشاء والتعديل.
   - تضمن رسائل خطأ واضحة باللغة العربية وتوافق الأنواع مع TypeScript تلقائياً.

3. **Service (`src/modules/*/*.service.ts`)**:
   - منطق الأعمال النقي (Business Logic): فحص تكرار البريد، حساب الأسعار، التحقق من المخزون، معالجة السلال، فحص الكوبونات، وإنشاء جلسات الدفع.
   - لا تتعامل مع كائنات `Request` أو `Response` الخاصة بـ HTTP.

4. **Repository (`src/modules/*/*.repository.ts`)**:
   - الطبقة الوحيدة المسموح لها باستدعاء `prisma` واستعلامات قاعدة البيانات.
   - تقوم بالفلترة، الترقيم (Pagination)، وإجراء المعاملات الذرية (`$transaction`).

### ب. صيغة الاستجابة الموحدة والأخطاء (`src/lib/api-response.ts` & `api-error.ts`):
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

## 💳 7. تفاصيل إتمام الشراء، الدفع، وحجز المخزون (Week 4 Details)

### أ. تدفق إتمام الشراء الخادمي الموحد (`src/modules/checkout/checkout.service.ts`):
يتم إنشاء الطلب عبر مسار `POST /api/checkout/session` باتباع 7 خطوات صارمة:
1. **إعادة التحقق من السلة خادمياً (`validateCart`)**: لا يُعتمد أبداً على الأسعار أو الكميات القادمة من المتصفح كـ Source of Truth. إذا وُجد تعارض في السعر أو المخزون، يُرفض الطلب فوراً برمز `409 CART_INVALID`.
2. **احتساب الشحن (`calculateShipping`)**: التحقق من دعم الدولة وتحديد التكلفة ومدة التوصيل عبر `src/modules/shipping/shipping.service.ts`.
3. **التحقق من الكوبون (`validateCoupon`)**: فحص شروط الكوبون وتطبيق الخصم (نسبة مئوية أو مبلغ ثابت مع مراعاة السقف الأقصى `maxDiscountAmount`).
4. **التحقق من عنوان الشحن**: للمستخدم المسجل يتم التحقق الصارم من ملكية العنوان (`assertAddressOwnership`) لمنع التلاعب بمعرفات العناوين. للزائر يتم التحقق من بيانات العنوان والبريد الإلكتروني (`guestAddress`, `guestEmail`).
5. **احتساب ضريبة القيمة المضافة (VAT)**: تُحسب الضريبة حسب دولة التوصيل (مثلاً 15% للسعودية، 5% للإمارات وعمان، 20% لبريطانيا) على الصافي بعد الخصم `(subtotal - discount)`.
6. **إنشاء الطلب وحجز المخزون ذرياً (`createOrderWithStockReservation`)**:
   - تُنفذ العملية بالكامل داخل **معاملة Prisma واحدة (`prisma.$transaction`)**.
   - **المنتجات العادية**: يتم زيادة `reservedStock` بالكمية المطلوبة مع فحص شرط `stock - reservedStock >= quantity`.
   - **المتغيرات (Variants)**: يتم خصم الكمية مباشرة من حقل `stock` في جدول `ProductVariant`.
   - يتم إنشاء سجل الطلب بحالة `PENDING` وحالة دفع `UNPAID` مع إضافة سجل زمني في `OrderStatusLog`.
7. **إنشاء جلسة الدفع (Payment Session)**: استدعاء مزود الدفع المناسب وتوليد رابط جلسة الدفع `checkoutUrl`.

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

### د. تكامل بوابة Stripe والـ Webhook الآمن (`src/modules/payments/`):
- واجهة موحدة `PaymentProvider` (`src/modules/payments/payment.types.ts`).
- مزود Stripe (`providers/stripe.provider.ts`): ينشئ جلسة `checkout.sessions.create` مع حفظ معرف الجلسة في `Order.paymentRef`.
- **معالج Webhook الموثوق (`POST /api/webhooks/stripe`)**:
  - التحقق المشفر من ترويسة `stripe-signature` عبر `stripe.webhooks.constructEvent`.
  - معالجة حدث `checkout.session.completed`.
  - **تنفيذ Idempotent**: فحص هل الطلب مدفوع مسبقاً قبل المعالجة لتجنب التكرار.
  - استدعاء `markOrderPaid(orderId)` الذي يقوم بخصم المخزون الحقيقي `stock` وتصفير `reservedStock` المقابلة، وتحديث حالة الدفع إلى `PAID` وحالة الطلب إلى `CONFIRMED`.

---

## 🔐 8. الأمان وتحديد المعدل (Security & Rate Limiting)

1. **حماية مسارات الإدارة (Defense in Depth)**:
   - **الطبقة الأولى**: `src/middleware.ts` يفحص التوكن والدور ويمنع أي مستخدم ليس `ADMIN` أو `SUPER_ADMIN` مع إرجاع 403 لمسارات API.
   - **الطبقة الثانية**: استدعاء دالة `requireAdmin()` في بداية كل مسار تحكم إداري تحت `/api/admin/*`.
2. **تشفير كلمات المرور (`src/lib/password.ts`)**:
   - استخدام خوارزمية **Argon2id** بذاكرة ~19MB وتكرار زمني آمن، وهي المعيار الأكثر مناعة ضد هجمات الـ GPU مقارنة بـ bcrypt.
3. **تقييد معدل الطلبات (Rate Limiting via Upstash Redis)**:
   - `authRateLimit`: 10 طلبات في الدقيقة لكل عنوان IP لمسارات التسجيل والمصادقة.
   - `checkoutRateLimit`: 5 طلبات في الدقيقة لكل IP/مستخدم على مسار `POST /api/checkout/session` لمنع استنزاف المخزون والتلاعب.
4. **حماية ملكية الموارد (Resource Ownership)**:
   - العناوين لا يمكن تعديلها أو حذفها أو استخدامها في الطلب إلا من قبل المستخدم المالك لها.

---

## ⚙️ 9. متغيرات البيئة المطلوبة (Environment Variables)

ملف `.env` المعتمد:

```env
# قاعدة البيانات (PostgreSQL - Neon / Supabase)
DATABASE_URL="postgresql://username:password@ep-xyz.neon.tech/alzaintea?sslmode=require"

# مصادقة NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# تقييد المعدل عبر Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-upstash-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# إعدادات Stripe (الدفع الدولي)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# إعدادات بوابة الدفع الخليجية (Tap Payments أو Moyasar - المرحلة القادمة)
PAYMENT_PROVIDER="tap" # أو "moyasar"
LOCAL_GATEWAY_API_KEY="sk_test_..."
LOCAL_GATEWAY_WEBHOOK_SECRET="whsec_..."

# البريد الإلكتروني والإشعارات (المراحل القادمة)
RESEND_API_KEY="re_..."
WHATSAPP_API_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"
```

---

## ⚡ 10. أوامر التشغيل وإدارة المشروع (CLI Commands)

```bash
# تثبيت الحزم
npm install

# تشغيل خادم التطوير
npm run dev

# بناء المشروع وفحص الأخطاء البرمجية
npm run build
npm run lint

# أوامر Prisma ORM
npm run prisma:generate   # توليد Prisma Client
npm run prisma:push       # مزامنة سريعة لبيئة التطوير
npm run prisma:migrate    # إنشاء وتطبيق Migrations رسمية
npm run prisma:seed       # تشغيل بذر البيانات التجريبية (tsx prisma/seed.ts)
npm run prisma:studio     # استعراض قاعدة البيانات في واجهة رسومية
```

---

## 📅 11. حالة التقدم وخارطة الطريق التنفيذية (9-Week Roadmap)

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

---

### ⏳ المراحل القادمة (Upcoming Weeks):
- [ ] **الأسبوع 5: إتمام بوابات الدفع الخليجية (Tap/Moyasar) + الـ Webhooks المزدوجة**
  - [ ] بناء مزود البوابة الخليجية (`local.provider.ts`) لدعم Apple Pay و Mada والبطاقات الخليجية.
  - [ ] استكمال مسار الـ Webhook المحلي `/api/webhooks/local-gateway` بالتحقق من التوقيع الرقمي.
  - [ ] ربط التوجيه التلقائي للبوابات حسب دولة العميل (دول الخليج $\to$ Local، الدولي $\to$ Stripe).
  - [ ] اختبار دورة الدفع كاملة في بيئة الاختبار للبوابتين.
- [ ] **الأسبوع 6: دورة حياة الطلبات (Orders Lifecycle) + إدارة المخزون المتقدمة**
  - [ ] إدارة انتقالات حالات الطلب وسجل المتابعة (`OrderStatusLog`).
  - [ ] منطق تحرير المخزون المحجوز (Release reservedStock) تلقائياً عند فشل الدفع أو الإلغاء.
  - [ ] شاشات إدارة ومتابعة الطلبات وتحديث الشحنات في لوحة المدير (`/admin/orders`).
- [ ] **الأسبوع 7: المراجعات + المفضلة + إشعارات البريد ولوحة التقارير**
  - [ ] نظام تقييم المنتجات (`Review`) والتحقق من الشراء الفعلي (`verifiedPurchase`).
  - [ ] قائمة الرغبات (`Wishlist`).
  - [ ] إرسال إيميلات تأكيد الطلب والفواتير عبر Resend.
  - [ ] لوحة إحصائيات وتقارير المبيعات الشاملة للمدير (`/admin/page.tsx`).
- [ ] **الأسبوع 8: الفحص الأمني الشامل + اختبارات E2E + تحسين SEO والأداء**
  - [ ] تدقيق أمني ومراجعة معايير الحماية ومعدلات الطلبات (Security Hardening).
  - [ ] إضافة بيانات المنتجات المهيكلة (JSON-LD) و sitemap ديناميكي وتحسين محركات البحث.
  - [ ] كتابة اختبارات تكاملية و E2E لرحلة الشراء الكاملة (Vitest + Playwright).
- [ ] **الأسبوع 9: بيئة الاختبار (Staging) + اختبارات القبول (UAT) + الإطلاق الرسمي**
  - [ ] تجربة النظام بالكامل على بيئة Staging حقيقية.
  - [ ] مراجعة سرعة التحميل وتجربة المستخدم على مختلف الشاشات.
  - [ ] النشر النهائي للإنتاج (Vercel + Neon Production DB) وإطلاق المتجر.

---

> **ملاحظة للمطورين والوكلاء (AI Agents):** عند بدء أي أسبوع جديد أو إضافة ميزة، يرجى الحفاظ على معمارية Modular Monolith الصارمة (Route Handler -> Zod Validator -> Service -> Repository)، وعدم استدعاء Prisma أو كتابة منطق الأعمال داخل واجهات الـ HTTP مباشرة.
