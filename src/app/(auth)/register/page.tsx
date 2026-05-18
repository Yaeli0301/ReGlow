"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [referralCode, setReferralCode] = useState("");
  const [referralFromFriend, setReferralFromFriend] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setReferralFromFriend(true);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          email,
          password,
          ...(referralCode && { referralCode }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.registerFailed"));
        return;
      }

      window.location.assign(data.redirectTo || "/dashboard");
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
        <h1 className="mt-6 text-2xl font-bold">{t("auth.createAccount")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("auth.createSubtitle")}</p>

        {referralFromFriend && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {t("auth.referredBanner")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label={t("auth.businessName")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t("auth.passwordMin")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            {t("auth.createAccount")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
