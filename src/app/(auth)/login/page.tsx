"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/contexts/LanguageContext";
import { persistAuthClient, getPostLoginPath } from "@/lib/client-auth";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetch("/api/demo/status")
      .then((r) => r.json())
      .then((d) => setDemoMode(Boolean(d.demo)))
      .catch(() => setDemoMode(false));
  }, []);

  async function completeLogin(data: {
    token?: string;
    user?: { id: string; email: string; role: "admin" | "business"; businessName?: string; subscriptionTier?: string };
    redirectTo?: string;
  }) {
    if (!data.user) {
      setError(t("auth.loginFailed"));
      return;
    }
    const sessionUser = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      businessName: data.user.businessName || "ReGlow",
      subscriptionTier: (data.user.subscriptionTier || "none") as "none" | "basic" | "pro" | "premium",
    };
    if (data.token) {
      persistAuthClient(data.token, sessionUser);
    }
    const dest = data.redirectTo || getPostLoginPath(sessionUser.role);
    // Full navigation ensures httpOnly cookie is sent on the next request
    window.location.assign(dest);
  }

  function formatLoginError(data: {
    error?: string;
    code?: string;
    reason?: string;
    reasons?: string[];
  }): string {
    if (data.error && data.error !== "SYSTEM_NOT_READY") return data.error;
    if (data.code === "SYSTEM_NOT_READY") {
      return data.reason || data.reasons?.[0] || t("auth.systemNotReady");
    }
    return t("auth.loginFailed");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: {
        error?: string;
        code?: string;
        reason?: string;
        reasons?: string[];
        user?: {
          id: string;
          email: string;
          role: "admin" | "business";
          businessName?: string;
          subscriptionTier?: string;
        };
        token?: string;
        redirectTo?: string;
      } = {};
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(
          res.status >= 500
            ? "שגיאת שרת. נסי npm run dev:clean ואז רענני את הדף."
            : t("common.error")
        );
        return;
      }

      if (!res.ok) {
        setError(formatLoginError(data));
        return;
      }

      await completeLogin(data);
    } catch {
      setError("לא ניתן להתחבר לשרת. ודאי שהאפליקציה רצה (npm run dev).");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(role: "business" | "admin") {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(formatLoginError(data));
        return;
      }
      await completeLogin(data);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="card w-full max-w-md">
        <Link href="/" className="text-2xl font-bold text-brand-600">
          ReGlow
        </Link>
        <h1 className="mt-6 text-2xl font-bold">{t("auth.welcomeBack")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("auth.signInSubtitle")}</p>

        {demoMode && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">{t("auth.demoModeTitle")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => handleDemoLogin("business")}
                disabled={loading}
              >
                {t("auth.demoBusiness")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => handleDemoLogin("admin")}
                disabled={loading}
              >
                {t("auth.demoAdmin")}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={demoMode && loading}
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={demoMode && loading}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            {t("auth.signIn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
