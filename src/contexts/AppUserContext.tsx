"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/types";
import { hasActiveSubscription } from "@/lib/subscription";

const AppUserContext = createContext<SessionUser | null>(null);

export function AppUserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): SessionUser {
  const ctx = useContext(AppUserContext);
  if (!ctx) throw new Error("useAppUser must be used within AppUserProvider");
  return ctx;
}

export function useHasSubscription(): boolean {
  const user = useAppUser();
  return hasActiveSubscription(user.subscriptionTier);
}
