"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SubscriptionTier } from "@/types";

const DEMO_PLANS: { id: Exclude<SubscriptionTier, "none">; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "pro", label: "Pro" },
  { id: "premium", label: "Premium" },
];

interface DemoModeBannerProps {
  demo?: boolean;
  demoEmail?: string;
  subscriptionTier?: SubscriptionTier;
}

export function DemoModeBanner({
  demo = false,
  demoEmail,
  subscriptionTier = "pro",
}: DemoModeBannerProps) {
  const [resetting, setResetting] = useState(false);

  async function resetDemo() {
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      window.location.reload();
    } finally {
      setResetting(false);
    }
  }

  if (!demo) return null;

  const currentPlan = DEMO_PLANS.find((p) => p.id === subscriptionTier);

  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-bold">מצב דמו</span>
          {currentPlan && (
            <>
              <span className="mx-2 text-amber-700">·</span>
              <span>
                חבילה נוכחית: <strong>{currentPlan.label}</strong>
              </span>
            </>
          )}
          <span className="mx-2 text-amber-700">·</span>
          <span>
            נתונים לדוגמה בלבד
            {demoEmail && (
              <>
                {" "}
                — <code className="rounded bg-amber-100 px-1">{demoEmail}</code>
              </>
            )}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={resetting}
          onClick={resetDemo}
        >
          {resetting ? "מאפס..." : "איפוס דמו"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-200/80 pt-3">
        <span className="text-xs font-semibold text-amber-800">נסי חבילה אחרת:</span>
        {DEMO_PLANS.map((plan) => {
          const active = subscriptionTier === plan.id;
          return (
            <Link
              key={plan.id}
              href={`/demo/start?plan=${plan.id}`}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
              }`}
              aria-current={active ? "true" : undefined}
            >
              {plan.label}
              {active ? " ✓" : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
