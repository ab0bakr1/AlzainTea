// src/components/auth/AuthShell.tsx
// هيكل مرئي مشترك لصفحات المصادقة (عرض فقط — بلا منطق).
// يطابق لغة الصفحة الرئيسية: خلفية Hero داكنة + نقاط تألق + بطاقة بإطار ناعم.
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

const sparks = [
  { top: "16%", left: "9%", size: 3, delay: "0s" },
  { top: "78%", left: "18%", size: 3, delay: "1.4s" },
  { top: "30%", left: "92%", size: 3, delay: "2.4s" },
  { top: "84%", left: "86%", size: 3, delay: "3.2s" },
] as const;

interface AuthShellProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  brand?: string;
  tone?: "gold" | "danger";
  footer?: ReactNode;
  children?: ReactNode;
}

export default function AuthShell({
  icon,
  title,
  subtitle,
  brand,
  tone = "gold",
  footer,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-shell relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <style>{`
        .auth-shell{
          background:
            radial-gradient(60% 45% at 50% 0%,rgba(201,164,92,.14),transparent 70%),
            linear-gradient(160deg,#1a1612 0%,#0f0d0a 60%,#14110c 100%);
        }
        @keyframes auth-twinkle{0%,100%{opacity:.08;transform:scale(.6)}50%{opacity:.45;transform:scale(1)}}
        @keyframes auth-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .auth-spark{position:absolute;border-radius:9999px;background:#f0e6d3;animation:auth-twinkle 5s ease-in-out infinite}
        .auth-card{animation:auth-rise .7s cubic-bezier(.2,.7,.2,1) both}
        @media (prefers-reduced-motion:reduce){.auth-spark{animation:none;opacity:.25}.auth-card{animation:none}}
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {sparks.map((s, i) => (
          <span
            key={i}
            className="auth-spark"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        {brand && (
          <Link
            href="/"
            className="ds-font-heading mb-6 block text-center text-2xl font-bold text-[#f0e6d3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0e6d3]"
          >
            {brand}
          </Link>
        )}

        <div className="auth-card relative rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <span aria-hidden className="ds-gold-rule absolute inset-x-10 top-0" />

          <div className="mb-7 flex flex-col items-center gap-2 text-center">
            <span
              aria-hidden
              className={cn(
                "mb-2 flex size-16 items-center justify-center rounded-full border",
                tone === "danger"
                  ? "border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                  : "border-[var(--border-color-strong)] bg-[var(--color-primary-200)] text-[var(--color-accent-text)]",
              )}
            >
              {icon}
            </span>
            <h1 className="ds-font-heading text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && (
            <>
              <hr aria-hidden className="ds-gold-rule my-6 opacity-60" />
              <div className="space-y-2 text-center text-sm">{footer}</div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function AuthRules({ items }: { items: Array<{ ok: boolean; label: string }> }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs" aria-live="polite">
      {items.map(({ ok, label }) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-1.5",
            ok ? "text-[var(--color-accent-text)]" : "text-[var(--color-text-secondary)]",
          )}
        >
          {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
          {label}
        </li>
      ))}
    </ul>
  );
}

export const authLink =
  "font-medium text-[var(--color-accent-text)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";