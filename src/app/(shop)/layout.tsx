// src/app/(shop)/layout.tsx
// Layout مشترك للمتجر — يحتوي Header + Footer + CartDrawer

import type { ReactNode } from 'react'
import Header from '@/components/organisms/Navbar'
import Footer from '@/components/organisms/Footer'

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      {/* TODO: <CartDrawer /> */}
    </>
  )
}
