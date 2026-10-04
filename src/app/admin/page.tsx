// src/app/admin/page.tsx
// لوحة التحكم — نظرة عامة على أداء المتجر
import type { Metadata } from "next";
import DashboardStats from "@/components/admin/DashboardStats";

export const metadata: Metadata = {
  title: "لوحة التحكم | الزين للشاي",
};

export default function AdminDashboardPage() {
  return <DashboardStats />;
}