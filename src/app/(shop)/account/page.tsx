// src/app/(shop)/account/page.tsx
// صفحة الملف الشخصي

import type { Metadata } from "next";
import MyAccount from "@/components/shop/MyAccount";
import AddressesManager from "@/components/shop/AddressesManager";

export const metadata: Metadata = {
  title: "حسابي | الزين للشاي",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <MyAccount />
      <AddressesManager />
    </div>
  );
}