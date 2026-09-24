import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7: PrismaClient لم يعد يقرأ DATABASE_URL تلقائياً، يجب تمرير Driver Adapter صراحة.
// ssl: { rejectUnauthorized: false } ضروري غالباً مع Neon لأن محرك node-pg الجديد
// في Prisma 7 أصبح أكثر صرامة تجاه شهادات SSL مقارنة بمحرك Rust القديم.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// نمنع إنشاء اتصالات متعددة أثناء Hot Reload في بيئة التطوير
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}