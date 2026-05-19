"use client";

import { persistAuthClient } from "@/lib/client-auth";
import { resetDemoUpsellSegment } from "@/lib/demo/demo-upsell-timer";
import type { SessionUser, SubscriptionTier, UserRole } from "@/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const PLANS = ["basic", "pro", "premium"] as const;

function DemoStartInner() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan: SubscriptionTier = PLANS.includes(planParam as (typeof PLANS)[number])
    ? (planParam as SubscriptionTier)
    : "pro";

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const maxAttempts = 3;
      try {
        let data: {
          error?: string;
          userMessage?: string;
          user?: { id: string; email: string; role: string; businessName?: string; subscriptionTier?: string };
          token?: string;
          redirectTo?: string;
        } = {};
        let res: Response | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          res = await fetch("/api/demo/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
            credentials: "include",
          });
          data = await res.json();
          if (res.ok) break;
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }

        if (cancelled || !res) return;

        if (!res.ok) {
          setError(data.error || data.userMessage || "לא הצלחנו להפעיל את ההדגמה");
          return;
        }

        if (data.user && data.token) {
          const sessionUser: SessionUser = {
            id: data.user.id,
            email: data.user.email,
            role: (data.user.role === "admin" ? "admin" : "business") as UserRole,
            businessName: data.user.businessName || "ReGlow",
            subscriptionTier: (data.user.subscriptionTier || plan) as SubscriptionTier,
          };
          persistAuthClient(data.token, sessionUser);
        }

        resetDemoUpsellSegment();
        window.location.href = data.redirectTo || "/dashboard";
      } catch {
        if (!cancelled) {
          setError("שגיאת רשת — נסי שוב");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [plan]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-50 via-white to-accent-400/10 px-4">
      {error ? (
        <>
          <p className="text-center text-red-600">{error}</p>
          <a href="/login" className="text-brand-600 underline">
            חזרה להתחברות
          </a>
        </>
      ) : (
        <>
          <div className="h-10 w-10 animate-pulse rounded-full bg-brand-500" />
          <p className="font-medium text-brand-700">
            מכינים את ההדגמה ({plan})...
          </p>
        </>
      )}
    </div>
  );
}

export default function DemoStartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">
          טוען...
        </div>
      }
    >
      <DemoStartInner />
    </Suspense>
  );
}
