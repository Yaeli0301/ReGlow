"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
