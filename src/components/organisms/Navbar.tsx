"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ListMinus } from "../../../public/assets/icons/icons";
import { Routes } from "@/utils/routes";
import { cn } from "../../lib/cn";
import NavLogo from "../atoms/navbar/NavLogo";
import DesktopNavLinks from "../molecules/navbar/DesktopNavLinks";
import MobileNavHeader from "../molecules/navbar/MobileNavHeader";
import MobileNavLinks from "../molecules/navbar/MobileNavLinks";
import AuthActions from "../molecules/navbar/AuthActions";
import MobileAuthSection from "../molecules/navbar/MobileAuthSection";
import CartLink from "../molecules/navbar/CartLink";
import { iconButton } from "../molecules/navbar/auth-styles";

export default function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  // القائمة مفتوحة فقط على المسار الذي فُتحت فيه → تُغلق تلقائياً عند أي تنقّل
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const mainRoutes = Routes.filter((r) => r.id <= 3);
  const dropdownRoutes = Routes.filter((r) => r.id > 3);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // قائمة الجوال: قفل تمرير الصفحة + إغلاق بـ Escape أو عند التكبير لشاشة سطح المكتب
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpenFor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const closeNavbar = () => {
    setOpenFor(null);
    setDropdownOpen(false);
  };

  return (
    <header
      className={cn(
        "ds-bg sticky top-0 z-50 transition-shadow duration-300",
        isScrolled ? "shadow-md" : "shadow-sm",
      )}
    >
      <nav
        aria-label={t("mainNavigation")}
        className="ds-container flex h-20 items-center justify-between gap-4"
      >
        <NavLogo />

        <DesktopNavLinks
          mainRoutes={mainRoutes}
          dropdownRoutes={dropdownRoutes}
          dropdownOpen={dropdownOpen}
          toggleDropdown={() => setDropdownOpen((p) => !p)}
          closeNavbar={closeNavbar}
        />

        <div className="flex items-center gap-1 sm:gap-2">
          <CartLink />

          <div className="hidden md:block">
            <AuthActions />
          </div>

          <button
            type="button"
            onClick={() => setOpenFor(pathname)}
            aria-label={t("openMenu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className={cn(iconButton, "md:hidden")}
          >
            <ListMinus size={30} />
          </button>
        </div>
      </nav>

      {/* Mobile */}
      <div
        id="mobile-menu"
        inert={!open}
        className={cn(
          "fixed inset-0 z-[60] transition-[visibility] duration-300 md:hidden",
          open ? "visible" : "invisible",
        )}
      >
        <div
          aria-hidden
          onClick={closeNavbar}
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t("mobileMenu")}
          className={cn(
            "ds-bg absolute inset-y-0 end-0 flex w-full max-w-sm flex-col overflow-y-auto shadow-xl transition-transform duration-300 motion-reduce:transition-none",
            open ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full",
          )}
        >
          <MobileNavHeader onClose={closeNavbar} />
          <MobileNavLinks
            mainRoutes={mainRoutes}
            dropdownRoutes={dropdownRoutes}
            dropdownOpen={dropdownOpen}
            toggleDropdown={() => setDropdownOpen((p) => !p)}
            closeNavbar={closeNavbar}
          />
          <div className="mt-6 border-t border-[var(--color-form)] pt-6 pb-8">
            <MobileAuthSection onNavigate={closeNavbar} />
          </div>
        </aside>
      </div>
    </header>
  );
}