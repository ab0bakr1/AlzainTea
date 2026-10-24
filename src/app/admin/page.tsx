// src/app/admin/page.tsx
// لوحة التحكم — نظرة عامة على أداء المتجر
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DashboardStats from "@/components/admin/DashboardStats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPanel.meta");
  return { title: t("dashboardTitle") };
}

export default function AdminDashboardPage() {
  return <DashboardStats />;
}