// src/components/molecules/navbar/UserMenu.tsx
// القائمة المنسدلة للمستخدم المسجل (Desktop)

"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { getInitials, useAuthActions } from "@/hooks/useAuthActions";
import { useAccountLinks } from "./account-links";
import { focusRing, menuItemBase } from "./auth-styles";

export default function UserMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, isAdmin, logout, isLoggingOut } = useAuthActions();
  const links = useAccountLinks(isAdmin);
  const menuId = useId();

  // القائمة مفتوحة فقط على المسار الذي فُتحت فيه → تُغلق تلقائياً عند أي تنقّل
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenFor(null);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenFor(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const displayName = user.name?.trim() || user.email || "";
  const firstName = displayName.split(/\s+/)[0];

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  const handleLogout = () => {
    setOpenFor(null);
    void logout();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // إغلاق عند خروج التركيز (Tab) خارج القائمة
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenFor(null);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpenFor(open ? null : pathname)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("userMenu")}
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl ps-1 pe-2 transition-colors hover:bg-[var(--color-bg-alt)]",
          focusRing,
        )}
      >
        <span
          aria-hidden
          className="ds-bg-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
        >
          {getInitials(user.name, user.email)}
        </span>
        <span className="ds-text-primary hidden max-w-28 truncate text-sm font-medium lg:block">
          {firstName}
        </span>
        <ChevronDown
          aria-hidden
          size={16}
          className={cn("ds-text-secondary transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          id={menuId}
          ref={panelRef}
          role="menu"
          aria-label={t("userMenu")}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="ds-bg absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--color-form)] p-2 shadow-lg outline-none"
        >
          <div className="border-b border-[var(--color-form)] px-3 pt-2 pb-3">
            <p className="ds-text-primary truncate text-sm font-bold">{displayName}</p>
            {user.email && user.email !== displayName && (
              <p className="ds-text-secondary truncate text-xs">{user.email}</p>
            )}
          </div>

          <div className="py-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={cn(menuItemBase, "ds-text-primary text-sm")}
              >
                <Icon aria-hidden size={18} className="ds-text-secondary" />
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-[var(--color-form)] pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(menuItemBase, "text-sm text-red-600 disabled:opacity-60 dark:text-red-400")}
            >
              <LogOut aria-hidden size={18} />
              {isLoggingOut ? t("loggingOut") : t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}