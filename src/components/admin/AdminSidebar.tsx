"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { FolderTree, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Star, Store, X } from "lucide-react";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الفئات", icon: FolderTree },
  { href: "/admin/reviews", label: "المراجعات", icon: Star },
];

const ROLE_LABEL: Record<string, string> = { ADMIN: "مدير", SUPER_ADMIN: "مدير عام" };

const linkBase = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const idle = "text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/10";

export default function AdminSidebar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-5 dark:border-white/10">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary)] text-lg font-bold text-white">
          ز
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">الزين للشاي</p>
          <p className="text-xs text-[var(--color-text-secondary)]">لوحة الإدارة</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="التنقل الرئيسي">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${linkBase} ${active ? "bg-[var(--color-primary)] text-white shadow-sm" : idle}`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-black/10 p-3 dark:border-white/10">
        <Link href="/" className={`${linkBase} ${idle}`}>
          <Store className="h-[18px] w-[18px]" aria-hidden />
          عرض المتجر
        </Link>
        <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className={`${linkBase} ${idle} w-full`}>
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
          تسجيل الخروج
        </button>
        <p className="px-3 pt-2 text-xs text-[var(--color-text-secondary)]">
          {userName || "—"} · {ROLE_LABEL[role] ?? role}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* الشاشات الكبيرة */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-black/10 bg-[var(--color-bg)] dark:border-white/10 lg:block">
        {panel}
      </aside>

      {/* الجوال */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-[var(--color-bg)] px-4 py-3 dark:border-white/10 lg:hidden">
        <p className="font-bold">الزين للشاي</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85%] bg-[var(--color-bg)] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق القائمة"
              className="absolute end-3 top-4 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}