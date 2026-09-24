import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const API = join(SRC, "app", "api");

function walk(dir: string, match: (f: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, match, out);
    } else if (match(full)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (f: string) => relative(ROOT, f).split(sep).join("/");
const read = (f: string) => readFileSync(f, "utf8");

const routes = walk(API, (f) => /route\.ts$/.test(f)).map((f) => ({
  file: rel(f),
  path: rel(f).replace("src/app/", ""),
  src: read(f),
}));

const sourceFiles = walk(SRC, (f) => /\.(ts|tsx)$/.test(f) && !/__tests__/.test(f)).map((f) => ({
  file: rel(f),
  src: read(f),
}));

const has = (path: string, list: string[]) => list.some((p) => path.includes(p));

describe("API security audit", () => {
  it("finds route handlers", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it("route handlers never touch Prisma directly (Route → Service → Repository)", () => {
    const violations = routes
      .filter((r) => /@\/lib\/prisma|@prisma\/client|\bprisma\.(\$|[a-z]+\.)/.test(r.src))
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });

  it("every /api/admin/* route calls requireAdmin()", () => {
    const violations = routes
      .filter((r) => r.path.startsWith("app/api/admin/") || r.path.startsWith("api/admin/"))
      .filter((r) => !/requireAdmin\s*\(/.test(r.src))
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });

  it("user-scoped routes call requireUser() or requireAdmin()", () => {
    const scoped = ["api/orders", "api/reviews", "api/wishlist", "api/addresses"];
    const violations = routes
      .filter((r) => has(r.path, scoped) && !r.path.includes("api/admin/"))
      .filter((r) => !/requireUser\s*\(|requireAdmin\s*\(/.test(r.src))
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });

  it("mutating routes (POST/PUT/PATCH) validate input with Zod", () => {
    const MUTATING = /export\s+(?:async\s+function|const)\s+(?:POST|PUT|PATCH)\b/;
    const EXEMPT = ["api/webhooks/", "api/cron/", "api/auth/[...nextauth]", "/cancel/"];
    const violations = routes
      .filter((r) => MUTATING.test(r.src) && !has(r.path, EXEMPT))
      .filter((r) => !/\.(safeParse|parse|parseAsync|safeParseAsync)\(|validators?\b/.test(r.src))
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });

  it("routes use the unified error handler (fail / handleApiError)", () => {
    const violations = routes
      .filter((r) => !r.path.includes("api/auth/[...nextauth]"))
      .filter((r) => !/\bfail\(|handleApiError\(/.test(r.src))
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });

  it("dynamic params are awaited (Next.js 15/16 async params)", () => {
    const violations = routes
      .filter(
        (r) =>
          /\b(?:context|ctx)\.params\.\w+/.test(r.src) ||
          /params\s*:\s*\{\s*(?:id|slug)\s*:/.test(r.src),
      )
      .map((r) => r.file);
    expect(violations).toEqual([]);
  });
});

describe("Codebase security audit", () => {
  it("no unsafe raw SQL", () => {
    const violations = sourceFiles
      .filter((f) => /\$queryRawUnsafe|\$executeRawUnsafe/.test(f.src))
      .map((f) => f.file);
    expect(violations).toEqual([]);
  });

  it("dangerouslySetInnerHTML is only used inside JsonLd.tsx", () => {
    const violations = sourceFiles
      .filter((f) => /dangerouslySetInnerHTML/.test(f.src))
      .filter((f) => f.file !== "src/components/seo/JsonLd.tsx")
      .map((f) => f.file);
    expect(violations).toEqual([]);
  });

  it("no secrets exposed through NEXT_PUBLIC_ variables", () => {
    const violations = sourceFiles
      .filter((f) => /NEXT_PUBLIC_\w*(SECRET|PRIVATE|TOKEN|SERVICE_ROLE)/.test(f.src))
      .map((f) => f.file);
    expect(violations).toEqual([]);
  });
});