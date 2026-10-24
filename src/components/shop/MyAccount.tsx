"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
} from "lucide-react";
import Title from "@/components/atoms/Title";

// نفس لغة الصفحة الرئيسية: بطاقة داكنة منقّطة (مثل cta-box) + بطاقات فاتحة
// بأيقونات داخل دوائر (مثل بطاقات "لماذا الزين") + فاصل الكثبان الذهبي.
const darkCardStyle: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(240,230,211,.07) 1px, transparent 1px), linear-gradient(160deg, #1a1612 0%, #0f0d0a 60%, #14110c 100%)",
  backgroundSize: "22px 22px, auto",
};

export default function MyAccount() {
  const t = useTranslations("account");
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-36 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-form)]" />
        <div className="grid gap-5 sm:grid-cols-2 md:gap-6">
          <div className="h-24 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-form)]" />
          <div className="h-24 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-form)]" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] px-6 py-12 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-form)] text-[var(--color-accent-text)]"
        >
          <LogOut size={24} className="rtl:rotate-180" />
        </span>
        <p className="mx-auto mt-5 max-w-sm text-[var(--color-text-secondary)]">
          {t("signInPrompt")}
        </p>
        <Link href="/login" className="ds-btn ds-btn-primary mt-7 px-8">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const { name, email } = session.user;
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  const links = [
    { href: "/account/orders", label: t("orders"), desc: t("ordersDesc"), Icon: Package },
    { href: "/account/wishlist", label: t("wishlist"), desc: t("wishlistDesc"), Icon: Heart },
    ...(isAdmin
      ? [{ href: "/admin", label: t("adminPanel"), desc: t("adminPanelDesc"), Icon: LayoutDashboard }]
      : []),
  ];

  return (
    <div className="space-y-8">
      {/* بطاقة الملف الشخصي — داكنة دائماً في الوضعين مثل الـ Hero */}
      <div
        style={darkCardStyle}
        className="flex flex-wrap items-center gap-5 rounded-[var(--radius-2xl)] border border-[rgba(240,230,211,.12)] p-6 text-[#f0e6d3] md:gap-6 md:p-8"
      >
        <div
          aria-hidden
          className="ds-bg-gold ds-font-heading flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold shadow-[var(--shadow-gold)] ring-2 ring-[rgba(240,230,211,.18)] md:h-20 md:w-20 md:text-3xl"
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <Title
            size="lg"
            className="ds-font-heading truncate font-bold text-[#f0e6d3]!"
          >
            {name}
          </Title>
          <p dir="ltr" className="mt-1 truncate text-start text-sm text-[#c4b49e]">
            {email}
          </p>
          <p className="mt-3 inline-flex rounded-full border border-[rgba(201,164,92,.4)] bg-[rgba(201,164,92,.12)] px-3 py-1 text-xs font-semibold text-[var(--brand-gold-light)]">
            {t("role")}: {isAdmin ? t("roleAdmin") : t("roleCustomer")}
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="ds-btn ds-btn-outline cursor-pointer px-5 text-sm text-[#f0e6d3] hover:border-[rgba(201,164,92,.6)] hover:bg-white/5"
        >
          <LogOut size={16} className="rtl:rotate-180" />
          {t("signOut")}
        </button>
      </div>

      <div aria-hidden className="ds-dune-divider opacity-40" />

      <nav
        aria-label={t("title")}
        className={`grid gap-5 md:gap-6 ${links.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {links.map(({ href, label, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-[var(--radius-2xl)] border border-[var(--border-color)] bg-[var(--color-bg)] p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-form)] text-[var(--color-accent-text)] transition-colors duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)]"
            >
              <Icon size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{label}</span>
              <span className="mt-1 block truncate text-sm text-[var(--color-text-secondary)]">
                {desc}
              </span>
            </span>
            <ChevronRight
              size={18}
              aria-hidden
              className="shrink-0 text-[var(--color-text-disabled)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-accent-text)] rtl:rotate-180 rtl:group-hover:-translate-x-1"
            />
          </Link>
        ))}
      </nav>
    </div>
  );
}