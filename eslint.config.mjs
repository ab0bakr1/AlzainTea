import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
# خطة بناء متجر إلكتروني كاملة — متجر الزين للشاي (Alzain Tea)

> هذه الخطة مبنية على السياق الموجود في `CLAUDE.md` للمشروع، وتُكمل الفراغات التي تركتها في الـ Tech Stack (Backend و API Style)، ثم تضع خارطة طريق تنفيذية كاملة من الصفر حتى الإطلاق.

---

## 0. التقنيات المفقودة التي تم اختيارها

| الحقل | القيمة المختارة | السبب |
|---|---|---|
| **Backend** | **Next.js API Route Handlers** (نفس مشروع الـ Frontend، بدون خادم منفصل) | مشروعك موصوف مسبقًا في `CLAUDE.md` على أنه Next.js App Router بمسارات `src/app/api/*`. إضافة Express/NestJS منفصل يعني: نشر مضاعف، مزامنة Types يدوية بين Frontend/Backend، وتعقيد غير مبرر لمطور واحد. Next.js Route Handlers تعطيك REST كامل + Server Actions + مشاركة الأنواع (TypeScript) مع الواجهة مجانًا. يمكن لاحقًا فصل أي وحدة (مثل الدفع) إلى خدمة مستقلة إن احتجت التوسّع الحقيقي — لكن ليس الآن. |
| **API Style** | **REST** عبر Route Handlers، مع اعتبار **Server Actions** لعمليات الكتابة الداخلية البسيطة (مثل تحديث السلة) | REST أبسط للتوثيق والاختبار من طرف ثالث (Webhooks من Stripe/Tap تحتاج REST beton أصلاً)، ولا حاجة لتعقيد GraphQL (resolvers, schema stitching) في متجر بحجم متوسط. |

**الحكم على الاختيار الأصلي:** Next.js + TypeScript + Tailwind + Zustand + PostgreSQL/Prisma هو Stack ممتاز ومتوازن لمتجر إلكتروني حقيقي بحجم متوسط يديره مطور واحد. لا يوجد سبب تقني قوي لتغييره.

### نقاط القوة
- Next.js App Router يعطي SSR/ISR جاهز لصفحات المنتجات → ممتاز لـ SEO (بند أساسي في متجرك).
- Prisma + PostgreSQL يعطي علاقات قوية (منتجات↔فئات↔طلبات) مع Type Safety كامل.
- Zustand أخف من Redux لحالة بسيطة (سلة، دولة، عملة).
- next-intl + RTL مدمجين مسبقًا في مشروعك — نادرًا ما يكون هذا جاهزًا من البداية.

### نقاط الضعف والمخاطر المحتملة
| الخطر | التخفيف |
|---|---|
| Route Handlers تكبر وتتحول إلى "God Files" مع الوقت | فرض Layered Architecture صارمة (Controller → Service → Repository) من اليوم الأول (تفصيل في البند 6). |
| منطق الدفع المزدوج (Stripe + Tap/Moyasar) عرضة للأخطاء إن لم يُعزل جيدًا | نمط Adapter/Strategy — واجهة موحدة `PaymentProvider` تخفي التفاصيل (تفصيل في البند 12). |
| localStorage لسلة المشتريات يفشل في SSR ويحتاج Merge عند تسجيل الدخول | استخدام Zustand `persist` middleware + دمج صريح عند الـ Login (تفصيل في بند السلة). |
| عدم وجود Cache Layer (Redis) قد يبطئ صفحات المنتجات عالية الزيارة | تأجيل Redis إلى V2، الاعتماد على Next.js ISR + `revalidateTag` في MVP. |
| عملات بخانات عشرية مختلفة (KWD/BHD/OMR = 3 خانات) تسبب أخطاء تقريب في الدفع | مركزة كل التحويل في `currency.ts` (موجود عندك) + اختبارات وحدة مخصصة له. |

### أدوات إضافية موصى بها
- **Zod**: للتحقق من المدخلات (Validation) على مستوى الـ API — إلزامي، ليس اختياريًا.
- **bcrypt / argon2**: تشفير كلمات المرور (argon2 أفضل أمنيًا إن سمحت بيئة الاستضافة).
- **Resend** (موجود في `.env` عندك): بريد المعاملات (تأكيد الطلب، استعادة كلمة المرور).
- **Sentry**: تتبع الأخطاء في الإنتاج.
- **Vitest + Playwright**: اختبارات الوحدة والتكامل + E2E.
- **Upstash Redis**: Rate Limiting بدون خادم إضافي (متوافق مع Vercel).
- **Vercel Blob / Cloudflare R2**: تخزين صور المنتجات (ليس قاعدة البيانات).

### ما يجب تجنبه
- **Microservices**: لا يوجد مبرر لمطور واحد بحجم بيانات متوسط — تكلفة تشغيلية ومعرفية أعلى من الفائدة.
- **GraphQL**: تعقيد إضافي غير مبرر عندما REST كافٍ ومتوافق مباشرة مع Webhooks.
- **تخزين الصور في PostgreSQL كـ BLOB**: يبطئ النسخ الاحتياطي والاستعلامات — استخدم Object Storage ورابط فقط في DB.
- **Redux**: زائد عن الحاجة مع Zustand موجود بالفعل.
- **حساب الأسعار/الخصومات في الـ Frontend كمصدر حقيقة**: يجب أن يُعاد احتسابها دائمًا في الـ Backend وقت إنشاء الطلب.

### القرار المعماري: Modular Monolith
**Modular Monolith** — تطبيق Next.js واحد، لكن مقسم داخليًا إلى Modules مستقلة منطقيًا (`products`, `orders`, `payments`, `cart`...) كل واحد له Service/Repository خاص به ولا يستدعي بيانات module آخر مباشرة إلا عبر واجهته المعرّفة. هذا يعطيك:
- سهولة نشر وصيانة لمطور واحد (نشر واحد على Vercel).
- إمكانية استخراج أي Module إلى خدمة مستقلة لاحقًا إن كبر المشروع فعلاً (مثلاً خدمة دفع منفصلة).
- لا تكلفة Microservices (شبكة، تنسيق، مراقبة موزعة) بينما أنت لا تحتاجها الآن.

### ما يُؤجَّل لتجنّب التعقيد المبكر
- Redis / Caching متقدم → V2.
- Refresh Tokens المعقدة (rotation, blacklist) → استخدم JWT Session بسيط عبر NextAuth في MVP.
- إشعارات WhatsApp → V2 (البنية التحتية `WHATSAPP_API_TOKEN` جاهزة لكن التفعيل يُؤجَّل).
- تعدد Payment Providers الإقليمية بمنطق ديناميكي كامل (Feature Flags لكل بوابة) → V2؛ في MVP يكفي التوجيه الثابت حسب الدولة الموجود في `CLAUDE.md`.
- Multi-warehouse / تعدد المخازن → V3.
- برنامج الولاء (Loyalty Points) → V3.

---

## 1. تحليل نظام المتجر — الـ Modules

| المجموعة | Modules |
|---|---|
| **Customer** | Registration, Login/Logout, Profile, Addresses, Wishlist, Cart, Orders, Order Details, Reviews |
| **Products** | Products, Categories, Subcategories (اختياري، عبر `parentId` في `Category`)، Product Variants (وزن العلبة، نوع الشاي)، SKU، Stock، Pricing، Discounts، Status |
| **Search** | بحث نصي، فلترة (فئة/سعر/توفر)، ترتيب، Pagination |
| **Cart** | إضافة/حذف/تعديل كمية، تحقق من المخزون، Persistence، Guest Cart، Cart Merge |
| **Checkout** | عنوان، شحن، كوبون، دفع، مراجعة، إنشاء طلب |
| **Orders** | دورة حياة الطلب كاملة + حالات فشل/إرجاع |
| **Payments** | طبقة موحدة تدعم أكثر من مزود |
| **Coupons** | نسبة/مبلغ ثابت، صلاحية، حد أدنى/أقصى، حد استخدام |
| **Reviews** | تقييم، تعليق، حالة، Verified Purchase |
| **Notifications** | Email (Resend)، In-App، تحديثات الطلب |
| **Admin** | Dashboard, Products, Categories, Orders, Customers, Coupons, Reviews, Inventory, Reports, Settings |

---

## 2. قاعدة البيانات — Schema كامل (Prisma)

هذا يبني على النماذج الأساسية الموجودة في `CLAUDE.md` (`User`, `Category`, `Product`, `Order`, `OrderItem`, `Address`) ويضيف الجداول الناقصة لتغطية كل الـ Modules أعلاه.

```prisma
enum Role { CUSTOMER ADMIN SUPER_ADMIN }
enum OrderStatus { PENDING CONFIRMED PROCESSING SHIPPED DELIVERED CANCELLED RETURNED REFUNDED FAILED }
enum PaymentStatus { UNPAID PAID FAILED REFUNDED PENDING }
enum DiscountType { PERCENTAGE FIXED }
enum ReviewStatus { PENDING APPROVED REJECTED }
enum ProductStatus { DRAFT ACTIVE ARCHIVED OUT_OF_STOCK }

model User {
  id            String     @id @default(cuid())
  name          String
  email         String     @unique
  password      String?    // nullable لدعم OAuth مستقبلاً
  role          Role       @default(CUSTOMER)
  emailVerified DateTime?
  orders        Order[]
  addresses     Address[]
  reviews       Review[]
  wishlist      WishlistItem[]
  couponUsages  CouponUsage[]
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

model Category {
  id          String    @id @default(cuid())
  nameAr      String
  nameEn      String
  slug        String    @unique
  description String?
  image       String?
  parentId    String?
  parent      Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime  @default(now())
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
  id          String         @id @default(cuid())
  nameAr      String
  nameEn      String
  slug        String         @unique
  descAr      String
  descEn      String
  price       Decimal        @db.Decimal(10, 2) // USD أساسي
  compareAtPrice Decimal?    @db.Decimal(10, 2) // للخصم المعروض
  stock       Int            @default(0)
  reservedStock Int          @default(0)
  sku         String         @unique
  images      String[]
  status      ProductStatus  @default(DRAFT)
  categoryId  String
  category    Category       @relation(fields: [categoryId], references: [id])
  brandId     String?
  brand       Brand?         @relation(fields: [brandId], references: [id])
  variants    ProductVariant[]
  orderItems  OrderItem[]
  reviews     Review[]
  wishlistedBy WishlistItem[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([categoryId])
  @@index([status])
}

model ProductVariant {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  name      String   // مثال: "علبة 250غ"
  sku       String   @unique
  price     Decimal? @db.Decimal(10, 2) // override اختياري لسعر المنتج
  stock     Int      @default(0)
  orderItems OrderItem[]

  @@index([productId])
}

model Order {
  id            String        @id @default(cuid())
  userId        String?
  user          User?         @relation(fields: [userId], references: [id])
  guestEmail    String?
  status        OrderStatus   @default(PENDING)
  paymentMethod String        // "stripe" | "tap" | "moyasar"
  paymentStatus PaymentStatus @default(UNPAID)
  paymentRef    String?
  currency      String
  subtotal      Decimal       @db.Decimal(10, 2)
  discount      Decimal       @default(0) @db.Decimal(10, 2)
  shippingCost  Decimal       @db.Decimal(10, 2)
  tax           Decimal       @db.Decimal(10, 2)
  total         Decimal       @db.Decimal(10, 2)
  country       String
  vatNumber     String?
  notes         String?
  couponId      String?
  coupon        Coupon?       @relation(fields: [couponId], references: [id])
  shippingAddressId String?
  shippingAddress   Address?  @relation(fields: [shippingAddressId], references: [id])
  items         OrderItem[]
  statusHistory OrderStatusLog[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([status])
  @@index([paymentStatus])
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  quantity  Int
  price     Decimal  @db.Decimal(10, 2) // سعر الوحدة وقت الشراء (Snapshot)
}

model OrderStatusLog {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())
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
  id              String       @id @default(cuid())
  code            String       @unique
  type            DiscountType
  value           Decimal      @db.Decimal(10, 2)
  minOrderAmount  Decimal?     @db.Decimal(10, 2)
  maxDiscountAmount Decimal?   @db.Decimal(10, 2)
  usageLimit      Int?         // إجمالي مرات الاستخدام
  usageLimitPerUser Int?       @default(1)
  usedCount       Int          @default(0)
  isActive        Boolean      @default(true)
  startsAt        DateTime?
  expiresAt       DateTime?
  orders          Order[]
  usages          CouponUsage[]
  createdAt       DateTime     @default(now())
}

model CouponUsage {
  id       String @id @default(cuid())
  couponId String
  coupon   Coupon @relation(fields: [couponId], references: [id])
  userId   String
  user     User   @relation(fields: [userId], references: [id])
  usedAt   DateTime @default(now())

  @@unique([couponId, userId, usedAt])
}

model Review {
  id        String       @id @default(cuid())
  productId String
  product   Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  rating    Int          // 1-5
  comment   String?
  status    ReviewStatus @default(PENDING)
  verifiedPurchase Boolean @default(false)
  createdAt DateTime     @default(now())

  @@index([productId])
  @@unique([productId, userId]) // مراجعة واحدة لكل مستخدم لكل منتج
}

model WishlistItem {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  addedAt   DateTime @default(now())

  @@unique([userId, productId])
}
```

### ERD نصي مبسّط
```
User ──< Address ──< Order >── Coupon
 │                     │
 ├──< Review >── Product ──< OrderItem >── Order
 │                 │  │
 ├──< WishlistItem>┘  └──< ProductVariant >── OrderItem
 │                 │
 │              Category (شجرة عبر parentId)
 │              Brand
 └──< CouponUsage >── Coupon
Order ──< OrderStatusLog
```

**العلاقات الأساسية:**
- `User 1—N Order` (زائر ممكن `userId = null` مع `guestEmail`).
- `Order 1—N OrderItem N—1 Product` (وربط اختياري بـ `ProductVariant`).
- `Category 1—N Product`, و`Category` تدعم تسلسل هرمي ذاتي (Self-relation) للفئات الفرعية.
- `Coupon 1—N Order` و`Coupon 1—N CouponUsage` لضبط حدود الاستخدام لكل مستخدم.
- `Product 1—N Review` بقيد فريد لمنع أكثر من مراجعة لنفس المستخدم على نفس المنتج.

---

## 3. Backend Architecture (Next.js Route Handlers)

```
src/
├── app/api/
│   ├── auth/[...nextauth]/route.ts
│   ├── products/route.ts              # GET (list), POST (admin create)
│   ├── products/[slug]/route.ts       # GET, PATCH, DELETE
│   ├── categories/route.ts
│   ├── cart/route.ts                  # عمليات سلة الزائر (اختياري، أو تُدار محليًا فقط)
│   ├── orders/route.ts
│   ├── orders/[id]/route.ts
│   ├── checkout/session/route.ts      # إنشاء جلسة دفع
│   ├── coupons/validate/route.ts
│   ├── reviews/route.ts
│   ├── wishlist/route.ts
│   ├── shipping/calculate/route.ts
│   ├── webhooks/stripe/route.ts
│   ├── webhooks/local-gateway/route.ts
│   ├── admin/products/route.ts
│   ├── admin/orders/route.ts
│   └── admin/reports/route.ts
├── modules/                           # ← منطق الأعمال بمعزل عن طبقة الـ HTTP
│   ├── products/
│   │   ├── product.service.ts
│   │   ├── product.repository.ts
│   │   └── product.validators.ts      # Zod schemas
│   ├── orders/
│   │   ├── order.service.ts
│   │   ├── order.repository.ts
│   │   └── order.validators.ts
│   ├── payments/
│   │   ├── payment.service.ts         # واجهة موحدة
│   │   ├── providers/stripe.provider.ts
│   │   └── providers/local.provider.ts (Tap/Moyasar)
│   ├── cart/
│   ├── coupons/
│   ├── reviews/
│   └── inventory/
├── middleware.ts                      # حماية /admin وحماية الجلسات
└── lib/                                # (كما في CLAUDE.md: auth.ts, prisma.ts, currency.ts...)
```

**مسؤولية كل طبقة:**
- **Route Handler (Controller)**: يستقبل الطلب، يتحقق من المصادقة/الصلاحية، يمرر البيانات للـ Service، يرجع Response موحد. لا منطق أعمال هنا إطلاقًا.
- **Validator (Zod)**: يتحقق من شكل المدخلات قبل وصولها للـ Service.
- **Service**: منطق الأعمال الحقيقي (حساب السعر، التحقق من المخزون، تطبيق الكوبون).
- **Repository**: طبقة الوصول لقاعدة البيانات عبر Prisma فقط — لا استعلامات Prisma خارج هذه الطبقة.
- **Middleware**: يتحقق من `session.user.role === 'ADMIN'` قبل الوصول لأي مسار `/admin` أو `/api/admin/*`.

---

## 4. API Specification (أهم الـ Endpoints)

### `/auth`
| Method | Endpoint | Auth | الوصف |
|---|---|---|---|
| POST | `/api/auth/register` | عام | تسجيل حساب جديد |
| POST | `/api/auth/[...nextauth]` (signin) | عام | تسجيل الدخول (Credentials) |
| POST | `/api/auth/forgot-password` | عام | إرسال رابط استعادة |
| POST | `/api/auth/reset-password` | عام + Token | تعيين كلمة مرور جديدة |

### `/products`
| Method | Endpoint | Auth | Query/Body |
|---|---|---|---|
| GET | `/api/products` | عام | `?category=&brand=&minPrice=&maxPrice=&sort=&page=&limit=&q=` |
| GET | `/api/products/[slug]` | عام | — |
| POST | `/api/admin/products` | ADMIN | body: بيانات المنتج + Zod validation |
| PATCH | `/api/admin/products/[id]` | ADMIN | body: حقول جزئية |
| DELETE | `/api/admin/products/[id]` | ADMIN | — |

### `/cart` (يمكن إدارتها محليًا عبر Zustand فقط بدون API، ما عدا التحقق من المخزون وقت Checkout)
| Method | Endpoint | Auth | الوصف |
|---|---|---|---|
| POST | `/api/cart/validate` | عام | التحقق من توفر جميع عناصر السلة والسعر الحالي قبل الدفع |

### `/checkout` و `/orders`
| Method | Endpoint | Auth | Body | أخطاء محتملة |
|---|---|---|---|---|
| POST | `/api/checkout/session` | عام (زائر مسموح) | `{items, addressId أو address, couponCode?, country}` | `400` مخزون غير كافٍ، `422` كوبون غير صالح |
| GET | `/api/orders` | مستخدم مسجل | — | `401` |
| GET | `/api/orders/[id]` | صاحب الطلب أو ADMIN | — | `403`, `404` |
| PATCH | `/api/admin/orders/[id]` | ADMIN | `{status}` | `400` انتقال حالة غير صالح |

### `/payments` (Webhooks فقط تُستقبل هنا، الإنشاء يتم داخل `/checkout/session`)
| Method | Endpoint | Auth | ملاحظة |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | توقيع Stripe | يتحقق من `stripe-signature` header |
| POST | `/api/webhooks/local-gateway` | توقيع المزود المحلي | يتحقق من `LOCAL_GATEWAY_WEBHOOK_SECRET` |

### `/coupons`
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/coupons/validate` | عام/مستخدم | `{code, subtotal, userId?}` → يرجع قيمة الخصم فقط، لا يُطبَّق فعليًا إلا وقت إنشاء الطلب |
| GET/POST/PATCH | `/api/admin/coupons` | ADMIN | CRUD كامل |

### `/reviews`
| Method | Endpoint | Auth | ملاحظة |
|---|---|---|---|
| POST | `/api/reviews` | مستخدم مسجل | يتحقق من `verifiedPurchase` عبر البحث في `OrderItem` |
| PATCH | `/api/admin/reviews/[id]` | ADMIN | الموافقة/الرفض |

### `/wishlist`
| Method | Endpoint | Auth |
|---|---|---|
| GET/POST/DELETE | `/api/wishlist` | مستخدم مسجل |

### `/admin`
| Method | Endpoint | Auth | الوصف |
|---|---|---|---|
| GET | `/api/admin/reports/overview` | ADMIN | إيرادات، طلبات، أفضل مبيعًا |
| GET | `/api/admin/reports/low-stock` | ADMIN | منتجات تحت حد معين |

**تنسيق Response موحد (نجاح):**
```json
{ "success": true, "data": { }, "meta": { "page": 1, "totalPages": 5 } }
```

---

## 5. Authentication & Authorization

- **NextAuth.js — Credentials Provider + JWT Strategy** (كما هو موصوف في `CLAUDE.md`).
- **Password Hashing**: `argon2` (أو `bcrypt` إن كانت بيئة الاستضافة لا تدعم native bindings لـ argon2).
- **Session**: JWT مخزّن في Cookie `httpOnly + secure + sameSite=lax`.
- **Refresh Tokens**: غير ضرورية في MVP — عمر جلسة NextAuth JWT (مثلاً 30 يوم) كافٍ لمتجر بحجم متوسط. تُضاف لاحقًا فقط إذا احتجت انتهاء صلاحية قصير + تجديد صامت.
- **Email Verification**: رابط تفعيل عبر Resend عند التسجيل (حقل `emailVerified` في Schema).
- **Password Reset**: Token عشوائي محدود الصلاحية (15 دقيقة) في جدول منفصل أو موقّع بـ JWT قصير الأجل.

**الأدوار:**
| الدور | الصلاحيات |
|---|---|
| `CUSTOMER` | إدارة حسابه، طلباته، مراجعاته فقط |
| `ADMIN` | كل مسارات `/admin` عدا إدارة صلاحيات المستخدمين الأخرى |
| `SUPER_ADMIN` | كل شيء + إدارة أدوار المستخدمين الآخرين وإعدادات النظام الحساسة |

الحماية تتم عبر `middleware.ts` (فحص أولي سريع للمسار) + فحص إضافي داخل كل Route Handler إداري (Defense in Depth — لا تعتمد على الـ Middleware فقط).

---

## 6. Frontend Architecture

يبني مباشرة على البنية الموجودة في `CLAUDE.md` (Atomic Design). الإضافات المطلوبة:
- **`services/`** (طبقة استدعاء الـ API عبر Axios/React Query) لعزل الصفحات عن تفاصيل fetch.
- **Forms**: `react-hook-form + zod` (نفس Zod schema المستخدم في الـ Backend عبر مجلد `shared/schemas` قابل للاستيراد من الجهتين — ميزة كون الكل Next.js واحد).
- **Loading/Empty/Error States**: مكونات موحدة في `components/ui/` (`Skeleton`, `EmptyState`, `ErrorBoundary`).

**الصفحات:** Home, Products (list+filter), Product Details, Categories, Search, Cart, Checkout (multi-step), Login, Register, Forgot/Reset Password, Profile, Addresses, Orders, Order Details, Wishlist — جميعها مذكورة أو مبنية جزئيًا حسب `CLAUDE.md`.

---

## 7. Admin Dashboard

- **Dashboard**: بطاقات (الإيرادات هذا الشهر، عدد الطلبات، عملاء جدد) + جدول "الأكثر مبيعًا" + تنبيه "مخزون منخفض".
- **Products**: CRUD كامل، رفع صور متعدد (إلى Object Storage)، إدارة Variants والمخزون والتسعير.
- **Orders**: عرض تفصيلي، تحديث الحالة (مع تسجيل كل تغيير في `OrderStatusLog`)، إلغاء، بدء استرجاع.
- **Customers**: بحث، عرض سجل الطلبات، تفعيل/تعطيل حساب.
- **Reports**: مبيعات حسب الفترة، حسب الفئة، حسب الدولة (مفيد لمتجر خليجي متعدد الدول).

---

## 8. إدارة المخزون (Inventory)

- `stock`: الكمية الفعلية في المستودع.
- `reservedStock`: تُحجز لحظة إنشاء الطلب (قبل تأكيد الدفع) لمنع Overselling أثناء انتظار الـ Webhook.
- **الكمية المتاحة للعرض = `stock - reservedStock`**.
- عند **إلغاء/فشل الدفع**: تُعاد `reservedStock` إلى الرصيد المتاح (Rollback عبر Prisma transaction).
- عند **تأكيد الدفع (Webhook)**: تُخصم من `stock` فعليًا وتُصفَّر `reservedStock` الخاصة بذلك الطلب.
- عند **الإرجاع/الاسترداد**: تُعاد الكمية إلى `stock` (بحسب سياسة المتجر لحالة المنتج المرتجع).
- **منع البيع دون توفر**: كل عملية إضافة للسلة والـ Checkout تمر عبر فحص `stock - reservedStock >= quantity` داخل **Prisma transaction** لمنع Race Conditions عند طلبين متزامنين على آخر قطعة.

---

## 9. Payment Architecture

```
Checkout Request
      ↓
 Payment Service (واجهة موحدة: createPaymentSession(order))
      ↓
 ┌────────────┬─────────────────┐
 │  Stripe    │  Tap / Moyasar  │   ← يُختار حسب دولة العميل (منطق موجود في CLAUDE.md)
 │  Provider  │  Provider       │
 └────────────┴─────────────────┘
      ↓
 Payment Result (redirect URL)
      ↓
   Webhook (موقّع رقميًا) → تحديث Order.paymentStatus + OrderStatus
```

- **PaymentProvider Interface** (كل مزود يطبقها): `createSession(order)`, `verifyWebhook(payload, signature)`, `refund(paymentRef, amount)`.
- **Successful/Failed/Cancelled/Pending**: تُدار حصريًا عبر Webhook — لا اعتماد على Redirect كما هو موثّق في `CLAUDE.md`.
- **Duplicate Payment**: `paymentRef` فريد على مستوى الطلب؛ الـ Webhook Handler idempotent (يتحقق هل الطلب مُحدَّث مسبقًا قبل إعادة المعالجة).
- **Refund**: مسار إداري يستدعي `provider.refund()` ثم يحدّث `OrderStatus = REFUNDED`.

---

## 10. Security Checklist

- تشفير كلمات المرور (argon2/bcrypt) — لا تخزين نصي أبدًا.
- JWT في Cookie `httpOnly, secure, sameSite`.
- CORS مقيّد لنطاق المتجر فقط لمسارات الـ API الحساسة.
- CSRF: NextAuth يوفر حماية مدمجة؛ لأي Form خارج NextAuth استخدم Token.
- XSS: تعقيم أي محتوى مُدخل من المستخدم (المراجعات) قبل العرض.
- SQL Injection: Prisma يحمي تلقائيًا طالما لا تُستخدم `$queryRawUnsafe`.
- Rate Limiting: على `/api/auth/*` و `/api/checkout/*` (عبر Upstash Redis).
- Input Validation: Zod على **كل** Endpoint بدون استثناء.
- File Upload: التحقق من نوع/حجم الملف، رفع مباشر إلى Object Storage عبر Signed URL (لا يمر الملف عبر خادمك).
- Environment Variables/Secrets: لا تُدفع إلى Git، تُدار عبر متغيرات بيئة الاستضافة (Vercel Secrets).
- HTTPS إلزامي في الإنتاج.
- عدم كشف تفاصيل الأخطاء الداخلية للعميل (فقط رسالة عامة + كود، والتفاصيل في الـ Logs).

**أخطاء شائعة يجب تجنبها:** الوثوق بسعر/خصم قادم من الـ Frontend، تخطي التحقق من `role` داخل الـ Route Handler نفسه (الاعتماد على الـ Middleware فقط)، تسجيل بيانات دفع حساسة في الـ Logs.

---

## 11. Performance

- **Frontend**: Code Splitting تلقائي (Next.js)، `next/image` لتحسين الصور، ISR لصفحات المنتجات (`revalidate`)، Pagination بدل تحميل كل المنتجات.
- **Backend**: Prisma `select` محدد (لا `include *`)، Rate Limiting، ضغط Responses (مفعّل تلقائيًا على Vercel).
- **Database**: Indexes على `categoryId`, `status`, `slug` (موجودة في الـ Schema أعلاه)، تجنّب N+1 عبر `include` مدروس.

---

## 12. SEO

- روابط نظيفة: `/products/[slug]`, `/category/[slug]`.
- Meta Title/Description ديناميكية لكل صفحة منتج (عبر `generateMetadata` في Next.js).
- Open Graph + Twitter Cards للمنتجات.
- `sitemap.xml` ديناميكي (`app/sitemap.ts`) يشمل كل المنتجات والفئات.
- `robots.txt` يستثني `/admin`, `/api`, `/account`.
- **Structured Data (JSON-LD)**: `Product` schema (سعر، توفر، تقييم)، `BreadcrumbList` schema.
- Canonical URLs لتفادي محتوى مكرر بسبب فلاتر البحث.

---

## 13. الصور والملفات

- **Object Storage خارجي** (Vercel Blob أو Cloudflare R2) — **وليس** PostgreSQL — لأن:
  - قاعدة البيانات تبقى صغيرة وسريعة النسخ الاحتياطي.
  - CDN مدمج لتسريع التحميل حول العالم (مهم لشحنك الدولي).
- Prisma يخزّن فقط الرابط (`String[]` في `Product.images`).
- رفع الصور عبر Signed Upload URL من الـ Backend، لا يمر الملف عبر خادم Next.js نفسه.

---

## 14. Error Handling الموحّد

```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "الكمية المطلوبة غير متوفرة حاليًا",
    "statusCode": 400
  }
}
```

| الحالة | Status Code |
|---|---|
| نجاح | 200/201 |
| خطأ تحقق (Zod) | 400 |
| غير مصادَق | 401 |
| غير مصرَّح | 403 |
| غير موجود | 404 |
| تعارض (كوبون مستخدم، طلب مكرر) | 409 |
| خطأ خادم | 500 |
| خطأ دفع | 402 أو 400 برمز `PAYMENT_ERROR` |

---

## 15. Logging & Monitoring

- **Sentry**: أخطاء Frontend + Backend.
- **Application Logs**: عبر Vercel Logs أو Pino إن أردت تنسيقًا منظمًا.
- **Payment/Order Logs**: كل تغيير حالة طلب يُسجَّل في `OrderStatusLog` (Audit Trail داخل DB نفسها).
- **Security Logs**: محاولات دخول فاشلة متكررة (Rate Limit + تنبيه).
- أداة مراقبة Uptime بسيطة: **UptimeRobot** أو **Vercel Analytics**.

---

## 16. استراتيجية الاختبار (Testing)

| النوع | الأداة | أهم السيناريوهات |
|---|---|---|
| Unit | Vitest | حساب السعر بعد الخصم، تحويل العملات (خاصة KWD/BHD/OMR)، منطق المخزون |
| Integration | Vitest + Prisma Test DB | إنشاء طلب كامل، تطبيق كوبون، تسجيل مستخدم |
| API | Vitest/Supertest | كل Endpoint: نجاح + حالات خطأ (401/403/400) |
| Auth | Vitest | تسجيل دخول خاطئ، انتهاء صلاحية الجلسة، وصول ADMIN لمسار محمي |
| Payment | Mocked Webhooks | Webhook ناجح، فاشل، مكرر (Idempotency) |
| E2E | Playwright | رحلة كاملة: تصفح → سلة → Checkout → دفع تجريبي → تأكيد الطلب |

---

## 17. Deployment

```
Local Dev → Git → GitHub → CI (Lint+Test) → Preview Deploy (Vercel) → Production (Vercel)
```

| المكوّن | الأداة المقترحة |
|---|---|
| Frontend + Backend Hosting | **Vercel** (طبيعي لـ Next.js) |
| Database Hosting | **Neon** أو **Supabase** (Postgres مُدار، فروع Preview لكل PR) |
| Image Storage | Vercel Blob / Cloudflare R2 |
| CI/CD | GitHub Actions (lint, test, prisma migrate deploy) |
| Domain + HTTPS | عبر Vercel تلقائيًا |
| Backups | نسخ احتياطي تلقائي يومي من مزوّد Postgres المُدار |
| Monitoring | Sentry + Vercel Analytics |

---

## 18. Git & Version Control

- **Branches**: `main` (إنتاج) ← `develop` (تكامل) ← `feature/*`, `fix/*`, `hotfix/*`.
- **Commit Convention (Conventional Commits)**:
  - `feat(cart): add guest cart merge on login`
  - `fix(payment): handle duplicate stripe webhook events`
  - `chore(prisma): add index on product.status`
- **Pull Requests**: مطلوبة حتى لمطور واحد (توثيق القرار + تشغيل CI قبل الدمج في `main`).
- **Releases/Tags**: Semantic Versioning `v1.0.0` عند كل إطلاق رئيسي.

---

## 19. Phases وترتيب التنفيذ (حسب الاعتماديات الفعلية)

1. **Planning & Architecture** (منجز جزئيًا — هذا المستند)
2. **Database Schema + Migrations**
3. **Auth (Register/Login/Roles)** — كل شيء آخر يعتمد على معرفة هوية المستخدم
4. **Products & Categories (Backend + Admin CRUD)**
5. **Products Frontend (List/Details/Search/Filter)**
6. **Cart (Frontend State + Stock Validation API)**
7. **Coupons (Backend logic)**
8. **Checkout + Shipping Calculation**
9. **Payments (Stripe أولاً، ثم Tap/Moyasar)**
10. **Orders (Lifecycle + Admin management)**
11. **Reviews + Wishlist**
12. **Notifications (Email)**
13. **Admin Dashboard (Reports)**
14. **Security Hardening + Rate Limiting**
15. **Testing (يوازي كل مرحلة سابقة فعليًا، ولا يُترك للنهاية)**
16. **SEO + Performance Polish**
17. **Deployment & Launch**

> **ملاحظة مهمة**: بند "Testing" هنا لا يعني كتابة كل الاختبارات في مرحلة منفصلة في النهاية — بل يجب كتابة اختبار لكل Module فور إنجازه. الترتيب أعلاه فقط لتوضيح الاعتمادية المنطقية.

---

## 20. أمثلة Tasks (نموذج لمرحلة "Checkout")

| Task | الوصف | Dependencies | الأولوية | النتيجة المتوقعة |
|---|---|---|---|---|
| بناء `shipping-rates` API | حساب تكلفة/مدة الشحن حسب الدولة | Database seed للدول | P0 | Endpoint يرجع `{cost, days, currency}` |
| بناء `coupons/validate` | التحقق من صلاحية الكوبون وحساب الخصم | Coupon model | P0 | يرجع قيمة الخصم أو خطأ واضح |
| صفحة Checkout متعددة الخطوات | عنوان → شحن → دفع → مراجعة | Cart state, Address API | P0 | تدفق كامل بدون إعادة تحميل الصفحة |
| ربط بوابة Stripe | إنشاء Checkout Session | Payment Service Interface | P0 | Redirect ناجح لصفحة الدفع |
| ربط بوابة Tap/Moyasar | نفس الشيء لدول الخليج | Payment Service Interface | P0 | Redirect ناجح لدول الخليج فقط |
| Webhook Handlers | تحديث حالة الطلب بعد تأكيد الدفع | Order model, Payment Providers | P0 | حالة الطلب تتحدث تلقائيًا وبأمان |

---

## 21. MVP مقابل V2 مقابل V3

### MVP (الإطلاق الأول)
- تسجيل/دخول، عرض منتجات، بحث وفلترة أساسية، سلة، عنوان واحد، شحن ثابت حسب الجدول الموجود، كوبون بسيط، دفع (Stripe + بوابة خليجية واحدة)، دورة حياة طلب كاملة، لوحة إدارة أساسية (منتجات/طلبات)، بريد تأكيد طلب.

### V2
- مراجعات المنتجات، Wishlist، إشعارات WhatsApp، تقارير إدارية متقدمة، عملة/دولة متعددة كاملة مع تحويل ديناميكي، Redis Caching، Refresh Tokens.

### V3
- برنامج ولاء، تعدد مستودعات، توصيات ذكية للمنتجات، تطبيق جوال مستقل، دعم أكثر من لغة إضافية.

---

## 22. تقدير الصعوبة

| Module | التقييم | السبب |
|---|---|---|
| Auth | Medium | NextAuth يبسّط الأمر لكن Roles + Verification تحتاج دقة |
| Products/Categories | Easy–Medium | CRUD قياسي |
| Cart + Merge | Medium | حالات Edge كثيرة (Guest→User، تعارض كميات) |
| Checkout + Shipping | Medium | حسابات متعددة العملات والدول |
| **Payments (Dual Gateway)** | **Very Hard** | أكثر جزء حرج أمنيًا وماليًا؛ Webhooks + Idempotency + عملات مختلفة الخانات العشرية |
| Orders Lifecycle | Medium | إدارة الحالات والـ Rollback على المخزون |
| Admin Dashboard | Medium | تقارير تحتاج استعلامات مجمّعة محسّنة |
| Reviews/Wishlist | Easy | منطق بسيط نسبيًا |
| SEO/i18n RTL | Medium | تفاصيل كثيرة لكن غير معقّدة منطقيًا |

**الأكثر تعقيدًا**: **نظام الدفع المزدوج** — يستحق أكبر وقت اختبار قبل الإطلاق.

---

## 23. خارطة طريق تنفيذية (أسابيع، لمطور واحد)

- **الأسبوع 1**: إعداد Schema كامل + Migrations + Seed بيانات تجريبية + Auth (تسجيل/دخول/أدوار).
- **الأسبوع 2**: Products/Categories Backend + Admin CRUD + صفحات المنتجات في الواجهة.
- **الأسبوع 3**: Cart (State + Persistence + Merge) + Search/Filter/Pagination.
- **الأسبوع 4**: Checkout (عناوين + شحن + كوبونات) + بدء تكامل Stripe.
- **الأسبوع 5**: إتمام Stripe + تكامل Tap/Moyasar + Webhooks + اختبار دورة الدفع كاملة.
- **الأسبوع 6**: Orders Lifecycle كامل + Admin Orders Management + منطق المخزون (Reserve/Release).
- **الأسبوع 7**: Reviews + Wishlist + بريد التأكيد (Resend) + Admin Dashboard/Reports.
- **الأسبوع 8**: Security Hardening (Rate Limiting, Validation audit) + SEO + Performance + اختبارات E2E شاملة.
- **الأسبوع 9**: Staging كامل + UAT + إصلاحات + **الإطلاق**.

---

## 24. Definition of Done — مثال (Products Module)

- [ ] CRUD كامل (API + Admin UI)
- [ ] Zod Validation على كل Endpoint
- [ ] حماية مسارات الإدارة بـ `role === 'ADMIN'`
- [ ] Pagination + Search + Filtering تعمل معًا
- [ ] معالجة الأخطاء بالتنسيق الموحد
- [ ] اختبارات Unit + Integration
- [ ] صور تُرفع لـ Object Storage وتُعرض عبر `next/image`
- [ ] SEO metadata لكل صفحة منتج
- [ ] توثيق الـ Endpoints (README أو Postman Collection)

---

## 25. المخطط النهائي للنظام

```
Customer (Web / Mobile Browser)
        │
        ▼
   Next.js Frontend (App Router, i18n RTL/LTR)
        │  (Server Actions / fetch)
        ▼
   Next.js API Route Handlers  ──────► Middleware (Auth/Role Check)
        │
        ▼
   Modules Layer (Service → Repository)
        │
        ▼
   Prisma ORM ──► PostgreSQL (Neon/Supabase)
        │
        ├──► Payment Providers: Stripe (دولي) / Tap-Moyasar (خليجي)
        ├──► Image Storage: Vercel Blob / Cloudflare R2
        ├──► Email Service: Resend
        ├──► Shipping: جدول ثابت (MVP) → API خارجي (V2)
        ├──► Admin Dashboard: نفس تطبيق Next.js، مسار محمي
        └──► Monitoring: Sentry + Vercel Analytics + Uptime Monitor
```

---

## 26. ترتيب التنفيذ النهائي الموصى به

1. Schema + Auth (الأساس الذي يعتمد عليه كل شيء)
2. Products/Categories (Backend + Frontend + Admin)
3. Cart
4. Checkout + Shipping + Coupons
5. Payments (Stripe ثم البوابة الخليجية) — **أعطِه وقتًا أطول من أي جزء آخر**
6. Orders Lifecycle + إدارة المخزون
7. Reviews + Wishlist + Notifications
8. Admin Dashboard + Reports
9. Security + Performance + SEO Hardening
10. Testing شامل (كان يتراكم أثناء كل مرحلة) → Staging → **الإطلاق**