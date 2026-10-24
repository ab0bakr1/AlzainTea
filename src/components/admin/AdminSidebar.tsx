"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";

const NAV = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag },
  { href: "/admin/products", key: "products", icon: Package },
  { href: "/admin/categories", key: "categories", icon: FolderTree },
  { href: "/admin/reviews", key: "reviews", icon: Star },
] as const;

const STORAGE_KEY = "alzain-admin-sidebar-collapsed";
const iconBtn = "rounded-lg p-2 text-[var(--color-on-inverse)] transition-colors hover:bg-white/10";

export default function AdminSidebar({ userName, role }: { userName: string; role: string }) {
  const t = useTranslations("adminPanel.sidebar");
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // درج الجوال
  const [collapsed, setCollapsed] = useState(false); // الشريط المصغّر (الشاشات الكبيرة)

  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // استرجاع تفضيل التصغير المحفوظ
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* التخزين غير متاح */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* التخزين غير متاح */
      }
      return next;
    });
  }

  // درج الجوال: Escape للإغلاق + منع تمرير الصفحة خلفه
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const roleLabel = role === "SUPER_ADMIN" ? t("roles.SUPER_ADMIN") : role === "ADMIN" ? t("roles.ADMIN") : role;

  const renderPanel = (compact: boolean) => {
    const link = `adm-nav-link ${compact ? "justify-center !px-0" : ""}`;
    const label = (text: string) => <span className={compact ? "sr-only" : "truncate"}>{text}</span>;

    return (
      <div className="flex h-full flex-col">
        <div
          className={`flex border-b border-[var(--adm-line)] py-5 ${
            compact ? "flex-col items-center gap-3 px-2" : "items-center gap-3 px-5"
          }`}
        >
          <span className="ds-bg-gold ds-font-heading grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold shadow-[var(--shadow-gold)]">
            {t("brandInitial")}
          </span>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="ds-font-heading truncate text-base font-bold leading-tight text-[var(--color-on-inverse)]">
                {t("brand")}
              </p>
              <p className="truncate text-xs text-[rgba(243,235,218,0.6)]">{t("panel")}</p>
            </div>
          )}

          {/* زر التصغير/التكبير بجانب الاسم: للشاشات الكبيرة فقط */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!compact}
            aria-label={compact ? t("expand") : t("collapse")}
            title={compact ? t("expand") : t("collapse")}
            className={`${iconBtn} hidden shrink-0 cursor-pointer lg:block`}
          >
            {compact ? (
              <PanelLeftOpen className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            ) : (
              <PanelLeftClose className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
            )}
          </button>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto ${compact ? "p-2" : "p-3"}`} aria-label={t("navLabel")}>
          {NAV.map((item) => {
            const { href, key, icon: Icon } = item;
            const exact = "exact" in item ? item.exact : false;
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={compact ? t(`nav.${key}`) : undefined}
                className={link}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {label(t(`nav.${key}`))}
              </Link>
            );
          })}
        </nav>

        <div className={`space-y-1 border-t border-[var(--adm-line)] ${compact ? "p-2" : "p-3"}`}>
          <Link href="/" className={link} title={compact ? t("viewStore") : undefined}>
            <Store className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {label(t("viewStore"))}
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`${link} cursor-pointer`}
            title={compact ? t("logout") : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {label(t("logout"))}
          </button>

          {!compact && (
            <p className="truncate px-3.5 pt-3 text-xs text-[rgba(243,235,218,0.55)]">
              {userName || "—"} · {roleLabel}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* الشاشات الكبيرة: يتصغّر إلى شريط أيقونات */}
      <aside
        className={`adm-side sticky top-0 hidden h-screen shrink-0 border-e border-[var(--adm-line)] transition-[width] duration-300 lg:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {renderPanel(collapsed)}
      </aside>

      {/* الجوال */}
      <header className="adm-side sticky top-0 z-30 flex items-center justify-between border-b border-[var(--adm-line)] px-4 py-3 lg:hidden">
        <p className="ds-font-heading font-bold text-[var(--color-on-inverse)]">{t("brand")}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={open}
          className={iconBtn}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="adm-drawer-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="adm-side adm-drawer absolute inset-y-0 start-0 w-72 max-w-[85%] shadow-[var(--shadow-lg)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeMenu")}
              className={`${iconBtn} absolute end-3 top-4 p-1.5`}
            >
              <X className="h-5 w-5" />
            </button>
            {renderPanel(false)}
          </aside>
        </div>
      )}
    </>
  );
}