import Link from "next/link";

interface Props {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function NavLink({
  to,
  children,
  onClick,
  className = "",
}: Props) {
  return (
    <Link
      href={to}
      onClick={onClick}
      className={`nav-link transition-colors hover:text-[var(--brand-gold-light)] focus-visible:text-[var(--brand-gold-light)] active:text-[var(--brand-gold-light)] ${className}`}
    >
      {children}
    </Link>
  );
}