import Link from "next/link";

interface Props {
  size?: "sm" | "lg";
}

export default function NavLogo({ size = "sm" }: Props) {
  return (
    <Link
      href="/"
      className={`text-light font-bold ${size === "lg" ? "text-4xl" : "text-2xl"}`}
    >
      Logo
    </Link>
  );
}
