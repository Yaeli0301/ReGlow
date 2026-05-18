"use client";

import { persistAuthClient } from "@/lib/client-auth";
import type { SessionUser, SubscriptionTier } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const PLANS = ["basic", "pro", "premium"] as const;

function DemoStartInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan: SubscriptionTier = PLANS.includes(planParam as (typeof PLANS)[number])
    ? (planParam as SubscriptionTier)
    : "pro";

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch("/api/demo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
          credentials: "include",
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || data.userMessage || "לא הצלחנו להפעיל את ההדגמה");
          return;
        }

        if (data.user && data.token) {
          const sessionUser: SessionUser = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            businessName: data.user.businessName || "ReGlow",
            subscriptionTier: (data.user.subscriptionTier || plan) as SubscriptionTier,
          };
          persistAuthClient(data.token, sessionUser);
        }

        router.replace(data.redirectTo || "/dashboard");
        router.refresh();
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
  }, [plan, router]);

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
