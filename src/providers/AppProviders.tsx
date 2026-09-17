import ThemeProvider from "./ThemeProvider";
import { NextIntlClientProvider } from "next-intl";

interface Props {
  children: React.ReactNode;
}
export default function AppProviders({ children }: Props) {
  return (
    <ThemeProvider>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </ThemeProvider>
  );
}
