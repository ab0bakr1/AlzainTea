import { useTranslations } from "next-intl";
import NavLink from "@/components/atoms/navbar/NavLink";

export interface NavRoute {
  id: number;
  path: string;
  key: string;
}
interface DesktopNavLinksProps {
  mainRoutes: NavRoute[];
  dropdownRoutes: NavRoute[];
  dropdownOpen: boolean;
  toggleDropdown: () => void;
  closeNavbar: () => void;
}
export default function DesktopNavLinks({ mainRoutes }: DesktopNavLinksProps) {
  const t = useTranslations("nav");

  return (
    <ul className="hidden items-center gap-8 text-base font-medium text-[#f0e6d3] md:flex">
      {mainRoutes.map((item) => (
        <li key={item.id}>
          <NavLink to={item.path}>
            {/* إن كان key مفتاح ترجمة داخل nav نترجمه، وإلا نعرضه كما هو */}
            {t.has(item.key as Parameters<typeof t>[0])
              ? t(item.key as Parameters<typeof t>[0])
              : item.key}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}