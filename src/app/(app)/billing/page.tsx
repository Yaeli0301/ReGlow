"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/types";
import type { SessionUser, SubscriptionTier } from "@/types";
import { ServicesManager } from "@/components/billing/ServicesManager";
import { ReferralPanel } from "@/components/referral/ReferralPanel";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [rewardMonths, setRewardMonths] = useState(0);
  const [useReferralReward, setUseReferralReward] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user));
    fetch("/api/referral")
      .then((res) => res.json())
      .then((data) => {
        if (data.rewardMonthsAvailable) {
          setRewardMonths(data.rewardMonthsAvailable);
        }
      });
  }, [success]);

  async function handleCheckout(tier: Exclude<SubscriptionTier, "none">) {
    setLoading(tier);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier,
        ...(useReferralReward && rewardMonths > 0 ? { useReferralReward: true } : {}),
      }),
    });
    const data = await res.json();
    setLoading(null);

    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function handlePortal() {
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (data.url) window.location.href = data.url;
  }

  const currentTier = user?.subscriptionTier || "none";

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-gray-500">
        Current plan:{" "}
        <span className="font-semibold capitalize text-brand-600">
          {currentTier === "none" ? "No active plan" : currentTier}
        </span>
      </p>

      {success && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          Payment successful! Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          Checkout canceled. You can try again anytime.
        </div>
      )}

      {rewardMonths > 0 && currentTier === "none" && (
        <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <input
            type="checkbox"
            checked={useReferralReward}
            onChange={(e) => setUseReferralReward(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          <span className="text-sm text-emerald-900">
            השתמשי בחודש חינם מהפניות ({rewardMonths} זמינים)
          </span>
        </label>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col ${
                isPopular ? "border-2 border-brand-500 shadow-soft ring-2 ring-brand-100" : ""
              }`}
            >
              {plan.tag && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white ${
                    isPopular ? "bg-brand-500" : "bg-accent-500"
                  }`}
                >
                  {plan.tag}
                </span>
              )}

              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-brand-600">
                ₪{plan.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="mt-2 flex-1 text-sm text-gray-600">{plan.description}</p>

              <Button
                className="mt-6 w-full"
                variant={isPopular ? "primary" : "secondary"}
                loading={loading === plan.id}
                disabled={isCurrent}
                onClick={() => handleCheckout(plan.id)}
              >
                {isCurrent ? "Current plan" : `Choose ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {currentTier !== "none" && (
        <div className="mt-8">
          <Button variant="secondary" loading={loading === "portal"} onClick={handlePortal}>
            Manage subscription
          </Button>
        </div>
      )}

      {currentTier === "premium" && user && (
        <>
          <div className="card mt-8">
            <h3 className="font-semibold">Your booking page</h3>
            <p className="mt-2 text-sm text-gray-600">Share this link with clients:</p>
            <code className="mt-2 block break-all rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              {typeof window !== "undefined"
                ? `${window.location.origin}/book/${user.id}`
                : `/book/${user.id}`}
            </code>
          </div>
          <ServicesManager />
        </>
      )}

      <ReferralPanel />
    </div>
  );
}
