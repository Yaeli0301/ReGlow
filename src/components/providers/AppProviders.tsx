"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  );
}
