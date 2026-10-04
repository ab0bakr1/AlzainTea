// src/app/admin/layout.tsx
// Layout لوحة التحكم — محمي بصلاحية ADMIN / SUPER_ADMIN
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !role || !ADMIN_ROLES.includes(role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-alt)] text-[var(--color-text-primary)] lg:flex">
      <AdminSidebar userName={session.user?.name ?? ""} role={role} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}