"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { MessagesInboxDrawer } from "@/components/messaging/MessagesInboxDrawer";
import { MessagesDrawerProvider } from "@/context/MessagesDrawerContext";
import { I18nProvider } from "@/lib/i18n/context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <I18nProvider>
        <MessagesDrawerProvider>
          {children}
          <MessagesInboxDrawer />
        </MessagesDrawerProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
