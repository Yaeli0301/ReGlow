"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/types";
import { hasActiveSubscription } from "@/lib/subscription";

const AppUserContext = createContext<SessionUser | null>(null);
const DemoModeContext = createContext(false);

export function AppUserProvider({
  user,
  children,
  demoMode = false,
}: {
  user: SessionUser;
  children: ReactNode;
  demoMode?: boolean;
}) {
  return (
    <AppUserContext.Provider value={user}>
      <DemoModeContext.Provider value={demoMode}>{children}</DemoModeContext.Provider>
    </AppUserContext.Provider>
  );
}

export function useAppUser(): SessionUser {
  const ctx = useContext(AppUserContext);
  if (!ctx) throw new Error("useAppUser must be used within AppUserProvider");
  return ctx;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}

export function useHasSubscription(): boolean {
  const user = useAppUser();
  return hasActiveSubscription(user.subscriptionTier);
}
