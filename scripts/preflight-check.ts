/**
 * scripts/preflight-check.ts
 *
 * فحص ما قبل النشر لمتغيرات البيئة. لا يطبع أي قيمة سرية أبداً.
 *
 * الاستخدام:
 *   npx tsx scripts/preflight-check.ts --env=staging    --file=.env.staging
 *   npx tsx scripts/preflight-check.ts --env=production --file=.env.production --against=.env.staging
 *
 * الخيارات:
 *   --env=staging|production   البيئة المستهدفة (إلزامي)
 *   --file=<path>              ملف .env يُقرأ منه (وحده). إن حُذف يُقرأ process.env
 *   --against=<path>           ملف بيئة أخرى للتأكد أن الأسرار وقاعدة البيانات غير مشتركة بين البيئتين
 *
 * رمز الخروج: 0 = سليم (قد توجد تحذيرات)، 1 = توجد أخطاء، 2 = خطأ في الاستخدام.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Target = "staging" | "production";
type Level = "error" | "warn";
type Env = Record<string, string | undefined>;

interface Finding {
  level: Level;
  key: string;
  message: string;
}

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "PAYMENT_PROVIDER",
  "LOCAL_GATEWAY_API_KEY",
  "LOCAL_GATEWAY_WEBHOOK_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

/** أسرار يجب ألا تتطابق بين staging و production */
const MUST_DIFFER_KEYS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
  "LOCAL_GATEWAY_WEBHOOK_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
] as const;

const PLACEHOLDER = /(your-|username:password|\.\.\.$|changeme|xxxx)/i;

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function loadEnvFile(path: string): Env {
  const full = resolve(process.cwd(), path);
  if (!existsSync(full)) {
    console.error(`❌ الملف غير موجود: ${full}`);
    process.exit(2);
  }
  const out: Env = {};
  for (const rawLine of readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      const commentAt = value.indexOf(" #");
      if (commentAt !== -1) value = value.slice(0, commentAt).trim();
    }
    out[key] = value;
  }
  return out;
}

function check(env: Env, target: Target): Finding[] {
  const findings: Finding[] = [];
  const add = (level: Level, key: string, message: string) =>
    findings.push({ level, key, message });
  const isProd = target === "production";

  // 1) الوجود وعدم كونها قيماً افتراضية
  for (const key of REQUIRED_KEYS) {
    const value = env[key];
    if (!value) {
      add("error", key, "غير معرّف أو فارغ");
    } else if (PLACEHOLDER.test(value)) {
      add("error", key, "ما زال يحتوي قيمة نموذجية (placeholder)");
    }
  }

  // 2) قاعدة البيانات
  const db = env.DATABASE_URL;
  if (db) {
    if (!/^postgres(ql)?:\/\//.test(db)) {
      add("error", "DATABASE_URL", "يجب أن يبدأ بـ postgresql://");
    }
    if (!/sslmode=require/.test(db)) {
      add("warn", "DATABASE_URL", "لا يحتوي sslmode=require");
    }
    if (/neon\.tech/.test(db) && !/-pooler\./.test(db)) {
      add(
        "warn",
        "DATABASE_URL",
        "يُفضّل استخدام رابط Neon المجمّع (-pooler) للتطبيق على Vercel، واستخدام الرابط المباشر للهجرات فقط",
      );
    }
  }

  // 3) NextAuth
  const authUrl = env.NEXTAUTH_URL;
  if (authUrl) {
    try {
      const u = new URL(authUrl);
      const local = ["localhost", "127.0.0.1"].includes(u.hostname);
      if (isProd && u.protocol !== "https:") {
        add("error", "NEXTAUTH_URL", "يجب أن يكون https في الإنتاج");
      }
      if (isProd && local) {
        add("error", "NEXTAUTH_URL", "يشير إلى localhost في الإنتاج");
      }
      if (!isProd && local) {
        add("warn", "NEXTAUTH_URL", "يشير إلى localhost؛ تأكد أنه رابط staging الفعلي");
      }
      if (u.pathname !== "/" && u.pathname !== "") {
        add("warn", "NEXTAUTH_URL", "يفضّل أن يكون الأصل فقط دون مسار");
      }
    } catch {
      add("error", "NEXTAUTH_URL", "ليس رابطاً صالحاً");
    }
  }
  if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length < 32) {
    add("error", "NEXTAUTH_SECRET", "أقصر من 32 حرفاً");
  }

  // 4) Cron
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) {
    add("error", "CRON_SECRET", "أقصر من 16 حرفاً");
  }

  // 5) Upstash
  if (env.UPSTASH_REDIS_REST_URL && !env.UPSTASH_REDIS_REST_URL.startsWith("https://")) {
    add("error", "UPSTASH_REDIS_REST_URL", "يجب أن يبدأ بـ https://");
  }

  // 6) Stripe: الوضع (test/live) يجب أن يطابق البيئة، والمفتاحان متطابقان
  const sk = env.STRIPE_SECRET_KEY ?? "";
  const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const skLive = /^(sk|rk)_live_/.test(sk);
  const skTest = /^(sk|rk)_test_/.test(sk);
  const pkLive = pk.startsWith("pk_live_");
  const pkTest = pk.startsWith("pk_test_");
  if (sk && !skLive && !skTest) add("error", "STRIPE_SECRET_KEY", "صيغة غير معروفة");
  if (pk && !pkLive && !pkTest) add("error", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "صيغة غير معروفة");
  if ((skLive && pkTest) || (skTest && pkLive)) {
    add("error", "STRIPE_*", "المفتاح السري والعام من وضعين مختلفين (test/live)");
  }
  if (isProd && skTest) add("error", "STRIPE_SECRET_KEY", "مفتاح test في الإنتاج");
  if (!isProd && skLive) add("error", "STRIPE_SECRET_KEY", "مفتاح live في staging — قد يخصم من بطاقات حقيقية");
  if (env.STRIPE_WEBHOOK_SECRET && !env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    add("error", "STRIPE_WEBHOOK_SECRET", "يجب أن يبدأ بـ whsec_");
  }

  // 7) البوابة الخليجية
  const provider = env.PAYMENT_PROVIDER;
  if (provider && !["tap", "moyasar"].includes(provider)) {
    add("error", "PAYMENT_PROVIDER", 'القيمة المسموحة: "tap" أو "moyasar"');
  }
  const gw = env.LOCAL_GATEWAY_API_KEY ?? "";
  if (gw) {
    if (isProd && /test/i.test(gw)) add("error", "LOCAL_GATEWAY_API_KEY", "يبدو مفتاح test في الإنتاج");
    if (!isProd && /live/i.test(gw)) add("error", "LOCAL_GATEWAY_API_KEY", "يبدو مفتاح live في staging");
  }

  // 8) Resend
  if (env.RESEND_API_KEY && !env.RESEND_API_KEY.startsWith("re_")) {
    add("error", "RESEND_API_KEY", "يجب أن يبدأ بـ re_");
  }
  const from = env.EMAIL_FROM ?? "";
  if (from) {
    if (!from.includes("@")) add("error", "EMAIL_FROM", "ليس بريداً صالحاً");
    if (/resend\.dev/i.test(from)) {
      add(
        isProd ? "error" : "warn",
        "EMAIL_FROM",
        isProd
          ? "onboarding@resend.dev يرسل لبريد صاحب الحساب فقط — وثّق دومينك في Resend وغيّر المرسل"
          : "onboarding@resend.dev يرسل لبريد صاحب حساب Resend فقط (مقبول للاختبار)",
      );
    }
  }

  return findings;
}

function compareEnvs(current: Env, other: Env): Finding[] {
  const findings: Finding[] = [];
  for (const key of MUST_DIFFER_KEYS) {
    if (current[key] && current[key] === other[key]) {
      findings.push({
        level: "error",
        key,
        message: "نفس القيمة مستخدمة في البيئتين — يجب فصلهما",
      });
    }
  }
  return findings;
}

function main() {
  const target = getArg("env") as Target | undefined;
  if (target !== "staging" && target !== "production") {
    console.error("الاستخدام: --env=staging|production [--file=.env.x] [--against=.env.y]");
    process.exit(2);
  }

  const file = getArg("file");
  const env: Env = file ? loadEnvFile(file) : { ...process.env };
  const findings = check(env, target);

  const againstFile = getArg("against");
  if (againstFile) findings.push(...compareEnvs(env, loadEnvFile(againstFile)));

  console.log(`\n🔎 فحص ما قبل النشر — البيئة: ${target}${file ? ` (${file})` : ""}\n`);

  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warn");

  for (const f of errors) console.log(`  ❌ ${f.key}: ${f.message}`);
  for (const f of warnings) console.log(`  ⚠️  ${f.key}: ${f.message}`);

  if (findings.length === 0) console.log("  ✅ كل الفحوصات نجحت");

  console.log(`\nالنتيجة: ${errors.length} خطأ، ${warnings.length} تحذير\n`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main();