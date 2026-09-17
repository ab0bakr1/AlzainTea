import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function hash(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function main() {
  console.log("🌱 بدء التعبئة...");

  // ---------------------------------------------------------------------
  // المستخدمون
  // ---------------------------------------------------------------------
  const adminPassword = await hash("Admin@12345");
  const customerPassword = await hash("Customer@12345");

  const admin = await prisma.user.upsert({
    where: { email: "admin@alzaintea.com" },
    update: {},
    create: {
      name: "مدير المتجر",
      email: "admin@alzaintea.com",
      password: adminPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "عميل تجريبي",
      email: "customer@example.com",
      password: customerPassword,
      role: "CUSTOMER",
      emailVerified: new Date(),
    },
  });

  // ---------------------------------------------------------------------
  // الفئات
  // ---------------------------------------------------------------------
  const categoriesData = [
    { nameAr: "شاي أسود", nameEn: "Black Tea", slug: "black-tea" },
    { nameAr: "شاي أخضر", nameEn: "Green Tea", slug: "green-tea" },
    { nameAr: "شاي أعشاب", nameEn: "Herbal Tea", slug: "herbal-tea" },
    { nameAr: "ملحقات الشاي", nameEn: "Tea Accessories", slug: "tea-accessories" },
  ];

  const categories = new Map<string, string>(); // slug -> id
  for (const c of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categories.set(c.slug, category.id);
  }

  // ---------------------------------------------------------------------
  // العلامة التجارية
  // ---------------------------------------------------------------------
  const brand = await prisma.brand.upsert({
    where: { slug: "alzain-select" },
    update: {},
    create: { nameAr: "الزين المختارة", nameEn: "Alzain Select", slug: "alzain-select" },
  });

  // ---------------------------------------------------------------------
  // المنتجات
  // ---------------------------------------------------------------------
  const productsData = [
    {
      nameAr: "شاي سيلاني أسود فاخر",
      nameEn: "Premium Ceylon Black Tea",
      slug: "premium-ceylon-black-tea",
      descAr: "أوراق شاي سيلاني مختارة بعناية، نكهة قوية ورائحة غنية.",
      descEn: "Hand-picked Ceylon tea leaves with a bold flavor and rich aroma.",
      price: 18.5,
      stock: 150,
      sku: "TEA-BLK-001",
      categorySlug: "black-tea",
      images: ["/assets/images/products/ceylon-black.jpg"],
    },
    {
      nameAr: "شاي أخضر ياباني (سينشا)",
      nameEn: "Japanese Sencha Green Tea",
      slug: "japanese-sencha-green-tea",
      descAr: "شاي سينشا الياباني الأصيل بطعم منعش ونكهة عشبية خفيفة.",
      descEn: "Authentic Japanese Sencha with a refreshing, grassy flavor.",
      price: 22.0,
      stock: 100,
      sku: "TEA-GRN-001",
      categorySlug: "green-tea",
      images: ["/assets/images/products/sencha.jpg"],
    },
    {
      nameAr: "شاي أعشاب بالنعناع والزنجبيل",
      nameEn: "Mint & Ginger Herbal Tea",
      slug: "mint-ginger-herbal-tea",
      descAr: "مزيج مهدئ من النعناع الطازج والزنجبيل، خالٍ من الكافيين.",
      descEn: "A soothing caffeine-free blend of fresh mint and ginger.",
      price: 15.0,
      stock: 200,
      sku: "TEA-HRB-001",
      categorySlug: "herbal-tea",
      images: ["/assets/images/products/mint-ginger.jpg"],
    },
    {
      nameAr: "إبريق شاي زجاجي مع مصفاة",
      nameEn: "Glass Teapot with Infuser",
      slug: "glass-teapot-infuser",
      descAr: "إبريق زجاجي مقاوم للحرارة مع مصفاة ستانلس ستيل قابلة للإزالة.",
      descEn: "Heat-resistant glass teapot with a removable stainless steel infuser.",
      price: 32.0,
      stock: 60,
      sku: "ACC-POT-001",
      categorySlug: "tea-accessories",
      images: ["/assets/images/products/glass-teapot.jpg"],
    },
  ];

  for (const p of productsData) {
    const categoryId = categories.get(p.categorySlug);
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        descAr: p.descAr,
        descEn: p.descEn,
        price: p.price,
        stock: p.stock,
        sku: p.sku,
        images: p.images,
        status: "ACTIVE",
        categoryId,
        brandId: brand.id,
      },
    });
  }

  console.log("✅ تمت التعبئة بنجاح:");
  console.log(`   - المدير: ${admin.email} / كلمة المرور: Admin@12345`);
  console.log(`   - العميل: ${customer.email} / كلمة المرور: Customer@12345`);
  console.log(`   - ${categoriesData.length} فئات، ${productsData.length} منتجات`);
}

main()
  .catch((e) => {
    console.error("❌ فشلت التعبئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });