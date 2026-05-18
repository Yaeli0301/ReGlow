"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { SessionUser, SubscriptionTier } from "@/types";
import { ServicesManager } from "@/components/billing/ServicesManager";
import { ReferralPanel } from "@/components/referral/ReferralPanel";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { getTranslatedPlans, tierLabel } from "@/i18n/plans";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const t = useT();
  const { locale } = useLanguage();
  const plans = useMemo(() => getTranslatedPlans(locale), [locale]);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [rewardMonths, setRewardMonths] = useState(0);
  const [useReferralReward, setUseReferralReward] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/referral"),
      fetch("/api/stripe/config"),
    ])
      .then(async ([meRes, refRes, stripeRes]) => {
        const meData = await meRes.json();
        const refData = await refRes.json();
        const stripeData = await stripeRes.json();
        setUser(meData.user);
        setStripeConfigured(stripeData.configured === true);
        if (refData.rewardMonthsAvailable) {
          setRewardMonths(refData.rewardMonthsAvailable);
        }
      })
      .catch(() => {});
  }, [success]);

  async function handleCheckout(tier: Exclude<SubscriptionTier, "none">) {
    setCheckoutError(null);
    setLoading(tier);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          ...(useReferralReward && rewardMonths > 0 ? { useReferralReward: true } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error || t("billing.checkoutFailed"));
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setCheckoutError(t("billing.checkoutFailed"));
    } catch {
      setCheckoutError(t("billing.checkoutFailed"));
    } finally {
      setLoading(null);
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
      <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
      <p className="mt-1 text-gray-500">
        {t("billing.currentPlan")}:{" "}
        <span className="font-semibold text-brand-600">
          {currentTier === "none" ? t("billing.noPlan") : tierLabel(locale, currentTier)}
        </span>
      </p>

      {success && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {t("billing.paymentSuccess")}
        </div>
      )}
      {canceled && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          {t("billing.paymentCanceled")}
        </div>
      )}

      {stripeConfigured === false && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t("billing.stripeNotConfigured")}
        </div>
      )}

      {checkoutError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {checkoutError}
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
            {t("billing.useFreeMonth")} ({rewardMonths} {t("billing.available")})
          </span>
        </label>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
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
                  className={`absolute -top-3 start-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white ${
                    isPopular ? "bg-brand-500" : "bg-accent-500"
                  }`}
                >
                  {plan.tag}
                </span>
              )}

              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-brand-600">
                {t("common.currency")}
                {plan.price}
                <span className="text-sm font-normal text-gray-500">{t("common.perMonth")}</span>
              </p>
              <p className="mt-2 flex-1 text-sm text-gray-600">{plan.description}</p>

              <Button
                className="mt-6 w-full"
                variant={isPopular ? "primary" : "secondary"}
                loading={loading === plan.id}
                disabled={isCurrent}
                onClick={() => handleCheckout(plan.id)}
              >
                {isCurrent ? t("billing.currentPlanBtn") : `${t("billing.choosePlan")} ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {currentTier !== "none" && (
        <div className="mt-8">
          <Button variant="secondary" loading={loading === "portal"} onClick={handlePortal}>
            {t("billing.manageSubscription")}
          </Button>
        </div>
      )}

      {currentTier === "premium" && user && (
        <>
          <div className="card mt-8">
            <h3 className="font-semibold">{t("billing.bookingPage")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("billing.shareBooking")}</p>
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
