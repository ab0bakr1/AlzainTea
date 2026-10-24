import { useTranslations } from "next-intl";
import NavLink from "../../atoms/navbar/NavLink";

interface RouteItem {
  id: number;
  path: string;
  key: string;
}

interface MobileNavLinksProps {
  mainRoutes: RouteItem[];
  dropdownRoutes: RouteItem[];
  dropdownOpen: boolean;
  toggleDropdown: () => void;
  closeNavbar: () => void;
}

export default function MobileNavLinks({
  mainRoutes,

  closeNavbar,
}: MobileNavLinksProps) {
  const t = useTranslations("nav");

  return (
    <ul className="mt-6 flex flex-col items-center gap-4 px-2 text-lg font-medium text-[#f0e6d3]">
      {mainRoutes.map((item) => (
        <li key={item.id}>
          <NavLink
            to={item.path}
            onClick={closeNavbar}
            className="ds-font-heading text-3xl font-semibold"
          >
            {t.has(item.key as Parameters<typeof t>[0])
              ? t(item.key as Parameters<typeof t>[0])
              : item.key}
          </NavLink>
        </li>
      ))}
      {/* أزرار الدخول/التسجيل/الخروج أصبحت في <MobileAuthSection /> داخل Navbar */}
    </ul>
  );
}