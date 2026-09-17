import NavLink from "../../atoms/navbar/NavLink";
import Button from "@/components/atoms/Button";

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
  return (
    <ul className="text-dark dark:text-light mt-4 flex flex-col items-center gap-2 px-2 text-lg font-medium">
      {mainRoutes.map((item) => (
        <li key={item.id}>
          <NavLink
            to={item.path}
            onClick={closeNavbar}
            className="text-2xl md:text-2xl"
          >
            {item.key}
          </NavLink>
        </li>
      ))}

      <Button size="md">login</Button>
    </ul>
  );
}
