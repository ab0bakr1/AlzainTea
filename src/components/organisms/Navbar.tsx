"use client";
import { useEffect, useState } from "react";
import { ListMinus } from "../../../public/assets/icons/icons";
import { Routes } from "@/utils/routes";
import { cn } from "../../lib/cn";
import NavLogo from "../atoms/navbar/NavLogo";
import NavIconButton from "../atoms/navbar/NavIconButton";
import DesktopNavLinks from "../molecules/navbar/DesktopNavLinks";
import MobileNavHeader from "../molecules/navbar/MobileNavHeader";
import MobileNavLinks from "../molecules/navbar/MobileNavLinks";
import Button from "../atoms/Button";
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const mainRoutes = Routes.filter((r) => r.id <= 3);
  const dropdownRoutes = Routes.filter((r) => r.id > 3);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeNavbar = () => {
    setOpen(false);
    setDropdownOpen(false);
  };

  return (
    <nav
      className={
        (cn("fixed top-0 z-50 h-20 ds-container transition-all duration-300 "),
        isScrolled ? "ds-bg  shadow-md" : "ds-bg shadow-sm")
      }
    >
      <div className="mx-auto flex items-center justify-between py-2 sm:px-10 md:px-0 md:py-4 ds-container">
        <NavLogo />

        <DesktopNavLinks
          mainRoutes={mainRoutes}
          dropdownRoutes={dropdownRoutes}
          dropdownOpen={dropdownOpen}
          toggleDropdown={() => setDropdownOpen((p) => !p)}
          closeNavbar={closeNavbar}
        />

        <div className="hidden md:block ">
          <Button size="md">login</Button>
        </div>
        <div className="md:hidden">
          <NavIconButton onClick={() => setOpen(true)}>
            <ListMinus size={30} />
          </NavIconButton>
        </div>
      </div>

      {/* Mobile */}
      <div
        className={cn(
          "ds-bg fixed top-0 right-0 z-40 h-screen w-full transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "translate-x-full",
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
      </div>
    </nav>
  );
}
