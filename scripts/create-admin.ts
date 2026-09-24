/**
 * scripts/create-admin.ts
 *
 * إنشاء أول مدير (SUPER_ADMIN) في الإنتاج بأمان، بدل تشغيل seed.ts الذي يحتوي مستخدمين تجريبيين.
 * كلمة المرور تُدخل بشكل مخفي في الطرفية ولا تُخزَّن في أي ملف ولا تظهر في سجل الأوامر.
 *
 * الاستخدام (PowerShell أو CMD أو Bash):
 *   npx tsx --env-file=.env.production scripts/create-admin.ts --email=owner@example.com --name="اسم المالك"
 *
 * الخيارات:
 *   --email=<email>          إلزامي
 *   --name=<name>            الاسم الظاهر (افتراضي: Admin)
 *   --role=SUPER_ADMIN|ADMIN الافتراضي SUPER_ADMIN
 *   --promote                يسمح بترقية مستخدم موجود وإعادة تعيين كلمة مروره
 *
 * ملاحظة: يفترض أن src/lib/prisma.ts يصدّر `prisma` باسم مسمّى (named export).
 * إن كان التصدير default فغيّر سطر الاستيراد أدناه فقط.
 */
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma";

type AdminRole = "ADMIN" | "SUPER_ADMIN";

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

/** قراءة سطر من الطرفية دون إظهار المدخلات */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolvePrompt) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolvePrompt(value);
          return;
        }
        if (char === "\u0003") process.exit(130); // Ctrl+C
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

function validatePassword(password: string): string | null {
  if (password.length < 12) return "كلمة المرور أقصر من 12 حرفاً";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "يجب أن تحتوي كلمة المرور على أحرف وأرقام";
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL غير معرّف. شغّل الأمر مع --env-file=.env.production");
  }

  const email = getArg("email")?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("مرّر --email=بريد@صالح.com");

  const name = getArg("name")?.trim() || "Admin";
  const role = (getArg("role") ?? "SUPER_ADMIN") as AdminRole;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") fail("--role يجب أن يكون ADMIN أو SUPER_ADMIN");
  const promote = process.argv.slice(2).includes("--promote");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !promote) {
    fail(`المستخدم ${email} موجود مسبقاً. أضف --promote إن أردت ترقيته وإعادة تعيين كلمة مروره.`);
  }

  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL as string).host;
    } catch {
      return "غير معروف";
    }
  })();
  console.log(`\nقاعدة البيانات: ${host}`);
  console.log(`الإجراء: ${existing ? "ترقية مستخدم موجود" : "إنشاء مستخدم جديد"} ← ${email} (${role})\n`);

  const password = await promptHidden("كلمة المرور (12 حرفاً على الأقل): ");
  const problem = validatePassword(password);
  if (problem) fail(problem);
  const confirm = await promptHidden("أعد كتابة كلمة المرور: ");
  if (confirm !== password) fail("كلمتا المرور غير متطابقتين");

  // نفس معاملات Argon2id الموصوفة في المشروع (~19MB) — الصيغة قياسية ويقرؤها argon2.verify
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: { role, password: hash, emailVerified: existing.emailVerified ?? new Date() },
      })
    : await prisma.user.create({
        data: { name, email, role, password: hash, emailVerified: new Date() },
      });

  console.log(`✅ تم: ${user.email} → ${user.role}`);
  console.log(`سجّل الدخول بهذا البريد بالضبط: ${user.email}`);
}

main()
  .catch((error) => {
    console.error("❌ فشل التنفيذ:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });