"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { clearAuthClient } from "@/lib/client-auth";
import { getProductionSignupUrl } from "@/lib/app-url";
import { switchDemoPlan, type DemoPlan } from "@/lib/demo/switch-demo-plan-client";
import { resetDemoUpsellSegment } from "@/lib/demo/demo-upsell-timer";
import type { SubscriptionTier } from "@/types";

const DEMO_PLANS: { id: Exclude<SubscriptionTier, "none">; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "pro", label: "Pro" },
  { id: "premium", label: "Premium" },
];

interface DemoModeBannerProps {
  demo?: boolean;
  /** External landing demo — emphasize signup to real account. */
  landingDemo?: boolean;
  demoEmail?: string;
  subscriptionTier?: SubscriptionTier;
}

export function DemoModeBanner({
  demo = false,
  landingDemo = false,
  demoEmail,
  subscriptionTier = "pro",
}: DemoModeBannerProps) {
  const [resetting, setResetting] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<DemoPlan | null>(null);
  const [planError, setPlanError] = useState("");

  async function resetDemo() {
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      resetDemoUpsellSegment();
      window.location.reload();
    } finally {
      setResetting(false);
    }
  }

  async function goToRegister() {
    setSigningUp(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearAuthClient();
      window.location.href = getProductionSignupUrl();
    } finally {
      setSigningUp(false);
    }
  }

  if (!demo) return null;

  const currentPlan = DEMO_PLANS.find((p) => p.id === subscriptionTier);
  const showReset = !landingDemo;

  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      {landingDemo && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4">
          <p className="font-semibold text-brand-800">זו הדגמה — נתונים לדוגמה בלבד</p>
          <p className="mt-1 text-sm text-brand-700">
            סיירו בחופשיות. כשתחליטו להצטרף, פתחו חשבון אמיתי (נפרד מהדמו).
          </p>
          <Button
            type="button"
            className="mt-3 min-h-[44px] w-full md:w-auto"
            disabled={signingUp}
            onClick={goToRegister}
          >
            {signingUp ? "מעבירה להרשמה..." : "מוכנה? הירשמו לחשבון אמיתי →"}
          </Button>
        </div>
      )}

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
        {showReset && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] text-xs md:w-auto"
            disabled={resetting}
            onClick={resetDemo}
          >
            {resetting ? "מאפס..." : "איפוס דמו"}
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-200/80 pt-3">
        <span className="text-xs font-semibold text-amber-800">נסי חבילה אחרת:</span>
        {DEMO_PLANS.map((plan) => {
          const active = subscriptionTier === plan.id;
          const busy = switchingPlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              disabled={active || busy || Boolean(switchingPlan)}
              onClick={async () => {
                setPlanError("");
                setSwitchingPlan(plan.id);
                const result = await switchDemoPlan(plan.id);
                setSwitchingPlan(null);
                if (!result.ok) {
                  setPlanError(result.error || "לא הצלחנו להחליף חבילה");
                  return;
                }
                window.location.reload();
              }}
              className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
              }`}
              aria-current={active ? "true" : undefined}
            >
              {busy ? "..." : plan.label}
              {active ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      {planError && <p className="mt-2 text-xs text-red-700">{planError}</p>}
    </div>
  );
}
