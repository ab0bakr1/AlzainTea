"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import ThemeProvider from "./ThemeProvider";

interface Props {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export default function AppProviders({ children, locale, messages }: Props) {
  // useState يضمن إنشاء QueryClient مرة واحدة فقط لكل جلسة متصفح،
  // ويمنع مشاركة الحالة بين طلبات مستخدمين مختلفين على الخادم (مهم مع SSR)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // متوافق مع staleTime: 60s الموثّق في CLAUDE.md
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
