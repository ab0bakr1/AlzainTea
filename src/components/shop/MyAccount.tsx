"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Heart, LayoutDashboard, LogOut, Package } from "lucide-react";
import Title from "@/components/atoms/Title";
import { useAccountText } from "./account-i18n";

export default function MyAccount() {
  const { t } = useAccountText();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link href="/login" className="font-medium underline">
        {t.signIn}
      </Link>
    );
  }

  const { name, email } = session.user;
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  const links = [
    { href: "/account/orders", label: t.orders, desc: t.ordersDesc, Icon: Package },
    { href: "/account/wishlist", label: t.wishlist, desc: t.wishlistDesc, Icon: Heart },
    ...(isAdmin ? [{ href: "/admin", label: t.adminPanel, desc: t.adminPanelDesc, Icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ds-bg-primary text-xl font-semibold text-white"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <Title size="md" className="truncate font-semibold">
            {name}
          </Title>
          <p dir="ltr" className="truncate text-start text-sm text-zinc-500">
            {email}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t.role}: {isAdmin ? t.roleAdmin : t.roleCustomer}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <LogOut size={16} className="rtl:rotate-180" />
          {t.signOut}
        </button>
      </div>

      <nav aria-label={t.title} className={`grid gap-4 ${links.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {links.map(({ href, label, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <Icon size={22} className="shrink-0 text-zinc-500" />
            <span className="min-w-0">
              <span className="block font-medium">{label}</span>
              <span className="block truncate text-sm text-zinc-500">{desc}</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}