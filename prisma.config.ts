import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // يُستخدم فقط من قبل CLI (migrate, generate, studio) — وليس وقت التشغيل الفعلي للتطبيق
    url: env("DATABASE_URL"),
  },
});