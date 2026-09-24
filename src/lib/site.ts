export const SITE_NAME = "Alzain Tea";
export const SITE_NAME_AR = "متجر الزين للشاي";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}