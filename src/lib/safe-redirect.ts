// src/lib/safe-redirect.ts
// يمنع هجمات Open Redirect: يقبل مسارات داخلية فقط ويتجنب حلقات /login و /register.
export function getSafeCallbackUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\r\n]/.test(raw)) return null;

  const path = raw.split(/[?#]/)[0];
  if (path === "/login" || path === "/register" || path.startsWith("/api/")) return null;

  return raw;
}