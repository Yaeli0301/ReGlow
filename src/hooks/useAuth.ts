"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearAuthClient } from "@/lib/client-auth";
import { useAppUser } from "@/contexts/AppUserContext";
import { useT } from "@/contexts/LanguageContext";
import type { UserRole } from "@/types";

export function useAuth() {
  const user = useAppUser();
  const router = useRouter();
  const t = useT();

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAuthClient();
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  const roleLabel =
    user.role === "admin" ? t("auth.roleAdmin") : t("auth.roleBusiness");

  const welcomeLabel =
    user.role === "admin" ? t("auth.welcomeAdmin") : t("auth.welcomeBusiness");

  return {
    user,
    role: user.role as UserRole,
    roleLabel,
    welcomeLabel,
    isAdmin: user.role === "admin",
    logout,
  };
}
